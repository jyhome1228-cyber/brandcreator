import type { LogoAsset, SvgViewBox } from '../types/guideline';

const ignoredColors = new Set(['none', 'transparent', 'currentcolor', 'inherit']);

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeColor(value: string): string | null {
  const color = value.trim().toLowerCase();
  if (ignoredColors.has(color) || color.startsWith('url(')) return null;

  const short = color.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) return `#${hex[1]}`.toUpperCase();

  const rgb = color.match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i);
  if (rgb) {
    const parts = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))));
    return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  return null;
}

function resolveViewBox(svg: SVGSVGElement): SvgViewBox {
  const rawViewBox = svg.getAttribute('viewBox');
  if (rawViewBox) {
    const values = rawViewBox.trim().split(/[\s,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
      return { x: values[0], y: values[1], width: values[2], height: values[3] };
    }
  }

  const width = parseLength(svg.getAttribute('width')) ?? 1000;
  const height = parseLength(svg.getAttribute('height')) ?? 1000;
  return { x: 0, y: 0, width, height };
}

function sanitize(svg: SVGSVGElement): void {
  svg.querySelectorAll('script, foreignObject').forEach((node) => node.remove());
  svg.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if ((name === 'href' || name.endsWith(':href')) && (value.startsWith('javascript:') || value.startsWith('http:') || value.startsWith('https:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
}

function detectColors(svg: SVGSVGElement): string[] {
  const colors = new Set<string>();

  svg.querySelectorAll('*').forEach((node) => {
    ['fill', 'stroke'].forEach((attribute) => {
      const raw = node.getAttribute(attribute);
      if (!raw) return;
      const normalized = normalizeColor(raw);
      if (normalized) colors.add(normalized);
    });

    const style = node.getAttribute('style') ?? '';
    for (const match of style.matchAll(/(?:fill|stroke)\s*:\s*([^;]+)/gi)) {
      const normalized = normalizeColor(match[1]);
      if (normalized) colors.add(normalized);
    }
  });

  return [...colors];
}

export function parseLogoSvg(raw: string, fileName = 'logo.svg'): LogoAsset {
  const parser = new DOMParser();
  const document = parser.parseFromString(raw, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('SVG 코드를 읽을 수 없습니다. 올바른 SVG 파일인지 확인해주세요.');

  const root = document.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') throw new Error('SVG 루트 요소가 없습니다.');

  const svg = root as unknown as SVGSVGElement;
  sanitize(svg);
  const viewBox = resolveViewBox(svg);
  const serializer = new XMLSerializer();
  const inner = [...svg.childNodes].map((node) => serializer.serializeToString(node)).join('');

  return {
    fileName,
    raw,
    inner,
    viewBox,
    aspectRatio: viewBox.width / viewBox.height,
    colors: detectColors(svg),
  };
}
