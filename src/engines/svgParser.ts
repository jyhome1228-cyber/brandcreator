import type {
  LogoAnalysis,
  LogoAsset,
  LogoClassification,
  LogoComplexity,
  LogoOrientation,
  SvgViewBox,
} from '../types/guideline';

const ignoredColors = new Set(['none', 'transparent', 'currentcolor', 'inherit']);

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeColor(value: string): string | null {
  const color = value.trim().toLowerCase();
  if (ignoredColors.has(color) || color.startsWith('url(') || color.startsWith('var(')) return null;

  const short = color.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  const hex = color.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (hex) return `#${hex[1]}`.toUpperCase();

  const rgb = color.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i);
  if (rgb) {
    const parts = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))));
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

function sanitizeStyleText(value: string): string {
  return value
    .replace(/@import[^;]+;?/gi, '')
    .replace(/url\(\s*(['"]?)https?:[^)]+\1\s*\)/gi, 'none')
    .replace(/javascript\s*:/gi, '');
}

function sanitize(svg: SVGSVGElement): void {
  svg.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((node) => node.remove());

  svg.querySelectorAll('style').forEach((node) => {
    node.textContent = sanitizeStyleText(node.textContent ?? '');
  });

  const nodes = [svg, ...Array.from(svg.querySelectorAll('*'))];
  nodes.forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on')) node.removeAttribute(attribute.name);
      if ((name === 'href' || name.endsWith(':href')) && (value.startsWith('javascript:') || value.startsWith('http:') || value.startsWith('https:'))) {
        node.removeAttribute(attribute.name);
      }
      if (name === 'style' && /(?:javascript\s*:|url\(\s*['"]?https?:)/i.test(attribute.value)) {
        node.setAttribute('style', sanitizeStyleText(attribute.value));
      }
    });
  });
}

function addColor(colors: Set<string>, raw: string | null | undefined): void {
  if (!raw) return;
  const normalized = normalizeColor(raw);
  if (normalized) colors.add(normalized);
}

function detectColors(svg: SVGSVGElement): string[] {
  const colors = new Set<string>();
  const nodes = [svg, ...Array.from(svg.querySelectorAll('*'))];

  nodes.forEach((node) => {
    addColor(colors, node.getAttribute('fill'));
    addColor(colors, node.getAttribute('stroke'));

    const style = node.getAttribute('style') ?? '';
    for (const match of style.matchAll(/(?:fill|stroke)\s*:\s*([^;]+)/gi)) {
      addColor(colors, match[1]);
    }
  });

  svg.querySelectorAll('style').forEach((styleNode) => {
    const css = styleNode.textContent ?? '';
    for (const match of css.matchAll(/(?:fill|stroke)\s*:\s*([^;}]+)/gi)) {
      addColor(colors, match[1]);
    }
  });

  return [...colors];
}

function detectColorUsage(svg: SVGSVGElement): LogoAnalysis['color'] {
  const occurrences = new Map<string, number>();
  const count = (raw: string | null | undefined) => {
    if (!raw) return;
    const normalized = normalizeColor(raw);
    if (!normalized) return;
    occurrences.set(normalized, (occurrences.get(normalized) ?? 0) + 1);
  };

  const nodes = [svg, ...Array.from(svg.querySelectorAll('*'))];
  nodes.forEach((node) => {
    count(node.getAttribute('fill'));
    count(node.getAttribute('stroke'));
    const style = node.getAttribute('style') ?? '';
    for (const match of style.matchAll(/(?:fill|stroke)\s*:\s*([^;]+)/gi)) count(match[1]);
  });

  svg.querySelectorAll('style').forEach((styleNode) => {
    const css = styleNode.textContent ?? '';
    for (const match of css.matchAll(/(?:fill|stroke)\s*:\s*([^;}]+)/gi)) count(match[1]);
  });

  const total = [...occurrences.values()].reduce((sum, value) => sum + value, 0);
  const colors = [...occurrences.entries()]
    .map(([hex, value]) => ({
      hex,
      occurrences: value,
      usageRatio: total ? value / total : 0,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return {
    colors,
    dominant: colors[0]?.hex ?? null,
    colorCount: colors.length,
  };
}

function classifyOrientation(ratio: number): LogoOrientation {
  if (ratio >= 2.2) return 'horizontal';
  if (ratio <= 0.72) return 'vertical';
  if (ratio >= 0.85 && ratio <= 1.2) return 'compact';
  return 'balanced';
}

function transformPoint(x: number, y: number, matrix: DOMMatrix): { x: number; y: number } {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function measureVisualGeometry(
  serializedSvg: string,
  viewBox: SvgViewBox,
): { bounds: SvgViewBox; smallDetailRatio: number } {
  if (typeof document === 'undefined' || !document.body) {
    return { bounds: viewBox, smallDetailRatio: 0 };
  }

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:-100000px;width:1000px;height:1000px;visibility:hidden;pointer-events:none;';
  host.innerHTML = serializedSvg;
  document.body.appendChild(host);

  try {
    const mounted = host.querySelector('svg');
    if (!mounted) return { bounds: viewBox, smallDetailRatio: 0 };

    const graphics = Array.from(
      mounted.querySelectorAll<SVGGraphicsElement>('path,rect,circle,ellipse,line,polyline,polygon,text,use'),
    );

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const areas: number[] = [];

    graphics.forEach((element) => {
      try {
        const box = element.getBBox();
        if (!box.width && !box.height) return;
        const matrix = element.getCTM();
        if (!matrix) return;

        const points = [
          transformPoint(box.x, box.y, matrix),
          transformPoint(box.x + box.width, box.y, matrix),
          transformPoint(box.x, box.y + box.height, matrix),
          transformPoint(box.x + box.width, box.y + box.height, matrix),
        ];

        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const elementMinX = Math.min(...xs);
        const elementMaxX = Math.max(...xs);
        const elementMinY = Math.min(...ys);
        const elementMaxY = Math.max(...ys);

        minX = Math.min(minX, elementMinX);
        maxX = Math.max(maxX, elementMaxX);
        minY = Math.min(minY, elementMinY);
        maxY = Math.max(maxY, elementMaxY);
        areas.push(Math.max(0, (elementMaxX - elementMinX) * (elementMaxY - elementMinY)));
      } catch {
        // Some SVG elements cannot expose a bounding box in every browser.
      }
    });

    if (![minX, minY, maxX, maxY].every(Number.isFinite) || maxX <= minX || maxY <= minY) {
      return { bounds: viewBox, smallDetailRatio: 0 };
    }

    const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    const visualArea = Math.max(1, bounds.width * bounds.height);
    const smallDetails = areas.filter((area) => area / visualArea < 0.0125).length;

    return {
      bounds,
      smallDetailRatio: areas.length ? smallDetails / areas.length : 0,
    };
  } finally {
    host.remove();
  }
}

function classifyLogo(
  svg: SVGSVGElement,
  visualRatio: number,
  pathCount: number,
  groupCount: number,
): { type: LogoClassification; confidence: number } {
  const textCount = svg.querySelectorAll('text').length;

  if (textCount > 0 && pathCount > 0) return { type: 'combination', confidence: 0.8 };
  if (textCount > 0) return { type: 'wordmark', confidence: 0.9 };
  if (visualRatio >= 2.2) return { type: 'wordmark', confidence: pathCount >= 2 ? 0.74 : 0.62 };
  if (visualRatio >= 0.82 && visualRatio <= 1.22 && pathCount <= 8) return { type: 'symbol', confidence: 0.7 };
  if (visualRatio >= 0.82 && visualRatio <= 1.22 && pathCount > 18 && groupCount >= 2) return { type: 'emblem', confidence: 0.64 };
  return { type: 'unknown', confidence: 0.46 };
}

function complexityLabel(score: number): LogoComplexity {
  if (score <= 25) return 'low';
  if (score <= 55) return 'medium';
  if (score <= 75) return 'high';
  return 'very-high';
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function analyzeSvg(svg: SVGSVGElement, serializedSvg: string, viewBox: SvgViewBox): LogoAnalysis {
  const visual = measureVisualGeometry(serializedSvg, viewBox);
  const visualAspectRatio = visual.bounds.height > 0 ? visual.bounds.width / visual.bounds.height : viewBox.width / viewBox.height;
  const orientation = classifyOrientation(visualAspectRatio);

  const pathCount = svg.querySelectorAll('path').length;
  const groupCount = svg.querySelectorAll('g').length;
  const elementCount = svg.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon,text,use').length;
  const commandCount = Array.from(svg.querySelectorAll('path')).reduce((sum, path) => {
    const commands = path.getAttribute('d')?.match(/[a-df-z]/gi)?.length ?? 0;
    return sum + commands;
  }, 0);

  const color = detectColorUsage(svg);
  const rawScore =
    pathCount * 2.2 +
    elementCount * 1.2 +
    commandCount * 0.18 +
    color.colorCount * 4 +
    visual.smallDetailRatio * 30;
  const complexityScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const complexity = complexityLabel(complexityScore);
  const classification = classifyLogo(svg, visualAspectRatio, pathCount, groupCount);

  let clearSpace = 0.25;
  const rationale: string[] = ['Base clear space 0.25X'];

  if (complexity === 'high') {
    clearSpace += 0.05;
    rationale.push('High structural complexity +0.05X');
  } else if (complexity === 'very-high') {
    clearSpace += 0.1;
    rationale.push('Very high structural complexity +0.10X');
  }
  if (orientation === 'compact') {
    clearSpace += 0.05;
    rationale.push('Compact proportion +0.05X');
  }
  if (visual.smallDetailRatio >= 0.25) {
    clearSpace += 0.05;
    rationale.push('Fine detail density +0.05X');
  }
  clearSpace = Math.max(0.2, Math.min(0.5, roundToStep(clearSpace, 0.05)));

  let minimumDigitalPx = 32;
  if (complexity === 'medium') minimumDigitalPx += 8;
  if (complexity === 'high') minimumDigitalPx += 16;
  if (complexity === 'very-high') minimumDigitalPx += 24;
  if (visual.smallDetailRatio >= 0.2) minimumDigitalPx += 8;
  if (visualAspectRatio >= 4) minimumDigitalPx += 8;
  minimumDigitalPx = Math.max(24, Math.min(96, roundToStep(minimumDigitalPx, 4)));

  const minimumPrintMm = Math.max(6, Math.min(24, Math.round(minimumDigitalPx / 4)));

  const canvasArea = Math.max(1, viewBox.width * viewBox.height);
  const visualArea = Math.max(0, visual.bounds.width * visual.bounds.height);
  const canvasOccupancy = Math.max(0, Math.min(1, visualArea / canvasArea));

  return {
    geometry: {
      width: viewBox.width,
      height: viewBox.height,
      aspectRatio: viewBox.width / viewBox.height,
      visualAspectRatio,
      orientation,
      visualBounds: visual.bounds,
      canvasOccupancy,
    },
    structure: {
      elementCount,
      pathCount,
      groupCount,
      commandCount,
      smallDetailRatio: visual.smallDetailRatio,
      complexityScore,
      complexity,
    },
    color,
    classification,
    recommendation: {
      xBasis: 'logo-height',
      clearSpace,
      minimumPrintMm,
      minimumDigitalPx,
      rationale,
    },
  };
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
  const serializedSvg = serializer.serializeToString(svg);
  const colors = detectColors(svg);
  const analysis = analyzeSvg(svg, serializedSvg, viewBox);

  return {
    fileName,
    raw: serializedSvg,
    inner,
    viewBox,
    aspectRatio: viewBox.width / viewBox.height,
    colors,
    analysis,
  };
}
