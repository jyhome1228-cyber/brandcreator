import type { BrandProject, GuidelinePage, LogoAsset } from '../types/guideline';

const BLACK = '#111111';
const WHITE = '#FFFFFF';
const MUTED = '#767676';
const ERROR = '#E25555';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}

function normalizeHex(value: string, fallback = BLACK): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : fallback;
}

function luminance(hex: string): number {
  const clean = normalizeHex(hex).slice(1);
  const rgb = [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16) / 255);
  const linear = rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function contrastColor(background: string): string {
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? BLACK : WHITE;
}

function recolorInner(inner: string, color: string): string {
  return inner
    .replace(/fill=(['"])(?!none|transparent|url\()[^'"]+\1/gi, `fill="${color}"`)
    .replace(/stroke=(['"])(?!none|transparent|url\()[^'"]+\1/gi, `stroke="${color}"`)
    .replace(/fill\s*:\s*(?!none|transparent|url\()[^;"']+/gi, `fill:${color}`)
    .replace(/stroke\s*:\s*(?!none|transparent|url\()[^;"']+/gi, `stroke:${color}`);
}

function logoIsTooLight(asset: LogoAsset | null): boolean {
  if (!asset?.colors.length) return false;
  return asset.colors.every((color) => luminance(color) > 0.72);
}

function replaceNestedSvgInner(svg: string, x: number, y: number, width: number, height: number, inner: string): string {
  const pattern = new RegExp(`(<svg x="${x}" y="${y}" width="${width}" height="${height}"[^>]*>)[\\s\\S]*?(<\\/svg>)`);
  return svg.replace(pattern, `$1${inner}$2`);
}

function applyEnglishHeader(svg: string, englishName: string): string {
  const name = englishName.trim();
  if (!name) return svg;
  const size = name.length > 22 ? 52 : name.length > 14 ? 66 : 84;
  return svg.replace(
    /<text x="105" y="137" fill="([^"]+)" font-size="84" font-weight="700">[^<]*<\/text>/,
    `<text x="105" y="137" fill="$1" font-size="${size}" font-weight="700">${esc(name)}</text>`,
  );
}

function applyLetterSpacing(svg: string): string {
  return svg.replace('style="font-family:', 'style="letter-spacing:-0.03em;font-family:');
}

function applyVisibleLogoOnLightRulePages(page: GuidelinePage, project: BrandProject): string {
  if (!project.logo || !logoIsTooLight(project.logo)) return page.svg;
  const lightRulePages = new Set([
    '04-signature-logo',
    '05-grid-system-1',
    '06-grid-system-2',
    '07-clear-space-1',
    '08-clear-space-2',
    '09-minimum-size',
  ]);
  if (!lightRulePages.has(page.id)) return page.svg;

  const primary = normalizeHex(project.colors.primary);
  const visible = contrastRatio(primary, WHITE) >= 3 ? primary : BLACK;
  return page.svg.split(project.logo.inner).join(recolorInner(project.logo.inner, visible));
}

function applyVisibleFooterLogo(svg: string, project: BrandProject, inverted: boolean): string {
  if (!project.logo || inverted) return svg;
  const primary = normalizeHex(project.colors.primary);
  if (contrastRatio(primary, WHITE) >= 2.1) return svg;
  const inner = recolorInner(project.logo.inner, BLACK);
  const pattern = /(<svg x="105" y="1930" width="150" height="55"[^>]*>)[\s\S]*?(<\/svg>)/;
  return svg.replace(pattern, `$1${inner}$2`);
}

function preventWhiteOnWhite(page: GuidelinePage, project: BrandProject): string {
  if (!project.logo) return page.svg;
  let svg = page.svg;
  const primary = normalizeHex(project.colors.primary);
  const accent = normalizeHex(project.colors.accent);

  if (page.id === '13-color-combination' && contrastRatio(primary, WHITE) < 2.1) {
    svg = replaceNestedSvgInner(svg, 2102, 538, 628, 220, recolorInner(project.logo.inner, BLACK));
  }

  if (page.id === '14-color-usage') {
    const logoColors = [primary, WHITE, BLACK, accent];
    logoColors.forEach((logoColor, col) => {
      if (contrastRatio(logoColor, WHITE) >= 2.1) return;
      const x = 1035 + col * 366 + 58;
      svg = replaceNestedSvgInner(svg, x, 572, 250, 106, '');
    });
  }
  return svg;
}

function pageNumberColor(page: GuidelinePage, project: BrandProject): string {
  if (page.id === '02-index') return contrastColor(normalizeHex(project.colors.primary));
  if (['03-logo-section', '10-color-section', '15-typography-section'].includes(page.id)) {
    return contrastColor(normalizeHex(project.colors.accent, project.colors.primary));
  }
  return MUTED;
}

function addPageNumber(svg: string, page: GuidelinePage, index: number, project: BrandProject): string {
  if (page.id === '01-cover' || page.id === '18-back-cover') return svg;
  const color = pageNumberColor(page, project);
  const number = String(index + 1).padStart(2, '0');
  const opacity = color === MUTED ? '1' : '.72';
  const markup = `<text x="305" y="1970" fill="${color}" opacity="${opacity}" font-size="22" font-weight="500">${number}</text>`;
  return svg.replace(/<\/svg>\s*$/, `${markup}</svg>`);
}

export function postProcessGuidelinePages(pages: GuidelinePage[], project: BrandProject): GuidelinePage[] {
  return pages.map((page, index) => {
    let svg = page.svg;
    svg = applyVisibleLogoOnLightRulePages({ ...page, svg }, project);
    svg = preventWhiteOnWhite({ ...page, svg }, project);
    svg = applyVisibleFooterLogo(svg, project, ['02-index', '03-logo-section', '10-color-section', '15-typography-section'].includes(page.id));
    svg = applyEnglishHeader(svg, project.englishName);
    svg = applyLetterSpacing(svg);
    svg = addPageNumber(svg, page, index, project);
    return { ...page, svg };
  });
}
