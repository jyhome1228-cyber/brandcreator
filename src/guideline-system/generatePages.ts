import type { BrandProject, GuidelinePage, LogoAsset } from '../types/guideline';
import { documentTokens as T } from './documentTokens';

const W = T.width;
const H = T.height;
const BLACK = '#111111';
const WHITE = '#FFFFFF';
const MUTED = '#767676';
const LINE = '#D9D9D9';
const SOFT = '#F7F7F7';
const GUIDE = '#5CC4D3';
const ERROR = '#E25555';

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}

function safeHex(value: string, fallback = BLACK): string {
  return /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : fallback;
}

function hexRgb(hex: string): [number, number, number] {
  const clean = safeHex(hex).slice(1);
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16)];
}

function rgbToCmyk(hex: string): [number, number, number, number] {
  const [r8, g8, b8] = hexRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 0.999) return [0, 0, 0, 100];
  return [
    Math.round(((1 - r - k) / (1 - k)) * 100),
    Math.round(((1 - g - k) / (1 - k)) * 100),
    Math.round(((1 - b - k) / (1 - k)) * 100),
    Math.round(k * 100),
  ];
}

function relativeLuminance(hex: string): number {
  const [r8, g8, b8] = hexRgb(hex);
  const convert = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(r8) + 0.7152 * convert(g8) + 0.0722 * convert(b8);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrast(hex: string): string {
  return contrastRatio(hex, BLACK) >= contrastRatio(hex, WHITE) ? BLACK : WHITE;
}

function wrap(text: string, max = 34): string[] {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return [];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if ([...next].length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

function textBlock(text: string, x: number, y: number, widthChars = 34, fill = BLACK): string {
  const lines = wrap(text, widthChars);
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="35" font-weight="400">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : 56}">${esc(line)}</tspan>`)
    .join('')}</text>`;
}

function fontStack(font: string): string {
  const safe = font.replace(/[<>"']/g, '').trim() || 'Pretendard';
  return `'${safe}',Pretendard,'Noto Sans KR',Arial,sans-serif`;
}

function openSvg(project: BrandProject, background = WHITE): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 ${W} ${H}" style="font-family:${fontStack(project.typography.body)}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision"><rect width="${W}" height="${H}" fill="${background}"/>`;
}

function recolorInner(inner: string, color: string): string {
  return inner
    .replace(/fill=(['"])(?!none|transparent|url\()[^'"]+\1/gi, `fill="${color}"`)
    .replace(/stroke=(['"])(?!none|transparent|url\()[^'"]+\1/gi, `stroke="${color}"`)
    .replace(/fill\s*:\s*(?!none|transparent|url\()[^;"']+/gi, `fill:${color}`)
    .replace(/stroke\s*:\s*(?!none|transparent|url\()[^;"']+/gi, `stroke:${color}`);
}

function logo(asset: LogoAsset | null, x: number, y: number, width: number, height: number, color?: string): string {
  if (!asset) {
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${LINE}" stroke-width="2"/><text x="${x + width / 2}" y="${y + height / 2}" fill="${MUTED}" font-size="34" text-anchor="middle">LOGO SVG</text>`;
  }
  const inner = color ? recolorInner(asset.inner, color) : asset.inner;
  const v = asset.viewBox;
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

function fitLogo(asset: LogoAsset | null, x: number, y: number, width: number, height: number, padding = 0): { x: number; y: number; width: number; height: number } {
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const ratio = asset?.aspectRatio && asset.aspectRatio > 0 ? asset.aspectRatio : 1;
  let renderedW = innerW;
  let renderedH = renderedW / ratio;
  if (renderedH > innerH) {
    renderedH = innerH;
    renderedW = renderedH * ratio;
  }
  return { x: x + (width - renderedW) / 2, y: y + (height - renderedH) / 2, width: renderedW, height: renderedH };
}

function footer(project: BrandProject, section: string, inverted = false): string {
  const color = inverted ? 'rgba(255,255,255,.72)' : MUTED;
  const line = inverted ? 'rgba(255,255,255,.28)' : LINE;
  const logoColor = inverted ? WHITE : safeHex(project.colors.primary);
  return `<line x1="105" y1="1895" x2="2865" y2="1895" stroke="${line}" stroke-width="2"/>${logo(project.logo, 105, 1930, 150, 55, logoColor)}<text x="1485" y="1970" fill="${color}" font-size="22" text-anchor="middle">${esc(section)}</text><text x="2865" y="1970" fill="${color}" font-size="22" text-anchor="end">Brand Guidelines</text>`;
}

function pageHeader(project: BrandProject, title: string, subtitle: string): string {
  const primary = safeHex(project.colors.primary);
  return `<text x="105" y="137" fill="${primary}" font-size="84" font-weight="700">${esc(title)}</text><text x="1035" y="137" fill="${primary}" font-size="35" font-weight="500">${esc(subtitle)}</text><line x1="105" y1="209" x2="2865" y2="209" stroke="${primary}" stroke-width="3"/>`;
}

function commonPage(project: BrandProject, title: string, subtitle: string, description: string, content: string): string {
  return `${openSvg(project)}${pageHeader(project, title, subtitle)}${textBlock(description, 105, 500)}${content}${footer(project, title)}</svg>`;
}

function sectionCover(project: BrandProject, section: string, number: string, items: string[]): string {
  const primary = safeHex(project.colors.primary);
  const accent = safeHex(project.colors.accent, primary);
  const bg = accent;
  const fg = contrast(bg);
  const itemMarkup = items.map((item, index) => `<text x="2145" y="${250 + index * 72}" fill="${fg}" font-size="48" font-weight="500">${esc(item)}</text>`).join('');
  return `${openSvg(project, bg)}<text x="105" y="1770" fill="${fg}" font-size="225" font-weight="700">${esc(section)}</text><text x="1900" y="310" fill="${fg}" opacity=".30" font-size="205" font-weight="700">${number}</text>${itemMarkup}${footer(project, section, true)}</svg>`;
}

function label(text: string, x: number, y: number, fill = MUTED): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="28" font-weight="500">${esc(text)}</text>`;
}

function measurementLine(x1: number, y1: number, x2: number, y2: number, text: string, textX: number, textY: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GUIDE}" stroke-width="2"/><line x1="${x1}" y1="${y1 - 10}" x2="${x1}" y2="${y1 + 10}" stroke="${GUIDE}" stroke-width="2"/><line x1="${x2}" y1="${y2 - 10}" x2="${x2}" y2="${y2 + 10}" stroke="${GUIDE}" stroke-width="2"/><text x="${textX}" y="${textY}" fill="${GUIDE}" font-size="27" text-anchor="middle">${esc(text)}</text>`;
}

function swatch(project: BrandProject, color: string, x: number, labelText: string): string {
  const hex = safeHex(color, '#777777');
  const [r, g, b] = hexRgb(hex);
  const [c, m, y, k] = rgbToCmyk(hex);
  const fg = contrast(hex);
  return `<rect x="${x}" y="460" width="570" height="1240" fill="${hex}"/>${label(labelText, x + 32, 530, fg)}<text x="${x + 32}" y="1500" fill="${fg}" font-size="28">HEX  ${hex}</text><text x="${x + 32}" y="1550" fill="${fg}" font-size="28">RGB  ${r} ${g} ${b}</text><text x="${x + 32}" y="1600" fill="${fg}" font-size="28">CMYK  ${c} ${m} ${y} ${k}</text>`;
}

function colorCell(project: BrandProject, bg: string, logoColor: string, x: number, y: number, w: number, h: number, title: string): string {
  const safeBg = safeHex(bg, WHITE);
  const safeLogo = safeHex(logoColor, BLACK);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${safeBg}"/>${label(title, x + 26, y + 44, contrast(safeBg))}${logo(project.logo, x + 135, y + 78, w - 270, h - 130, safeLogo)}`;
}

function usageCell(project: BrandProject, bg: string, logoColor: string, x: number, y: number, w: number, h: number): string {
  const ok = contrastRatio(bg, logoColor) >= 2.1;
  const mark = ok ? '' : `<line x1="${x + 18}" y1="${y + 18}" x2="${x + w - 18}" y2="${y + h - 18}" stroke="${ERROR}" stroke-width="8"/><line x1="${x + w - 18}" y1="${y + 18}" x2="${x + 18}" y2="${y + h - 18}" stroke="${ERROR}" stroke-width="8"/>`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>${logo(project.logo, x + 58, y + 52, w - 116, h - 104, logoColor)}${mark}`;
}

function typographySample(project: BrandProject, font: string, x: number, y: number, isTitle = false): string {
  const size = isTitle ? 162 : 130;
  return `<g style="font-family:${fontStack(font)}"><text x="${x}" y="${y}" fill="${BLACK}" font-size="${size}" font-weight="700">${esc(font)}</text><text x="${x}" y="${y + 190}" fill="${BLACK}" font-size="42">ABCDEFGHIJKLMNOPQRSTUVWXYZ</text><text x="${x}" y="${y + 255}" fill="${BLACK}" font-size="42">abcdefghijklmnopqrstuvwxyz</text><text x="${x}" y="${y + 320}" fill="${BLACK}" font-size="42">0123456789</text><text x="${x}" y="${y + 385}" fill="${BLACK}" font-size="42">#&amp;$+-%_?/()[]{}.,</text></g>`;
}

export function generateGuidelinePages(project: BrandProject): GuidelinePage[] {
  const primary = safeHex(project.colors.primary);
  const secondary = safeHex(project.colors.secondary, '#EAEAEA');
  const accent = safeHex(project.colors.accent, '#777777');
  const coverFg = contrast(primary);
  const ratio = project.logo?.aspectRatio && project.logo.aspectRatio > 0 ? project.logo.aspectRatio : 1;
  const ratioText = ratio.toFixed(2);
  const clear = Math.max(0.1, Math.min(2, project.rules.clearSpace || 0.25));
  const brandName = project.name || project.englishName || 'Brand';
  const logoCopy = `시그니처 로고는 ${brandName}를 대표하는 핵심 시각 자산입니다. 모든 공식 커뮤니케이션에서는 기본형을 우선 사용하며, 형태와 비율을 임의로 변경하지 않고 일관성을 유지합니다.`;
  const gridCopy = '그리드 시스템은 로고의 균형과 안정적인 비례를 유지하기 위한 기준입니다. 제작 및 재현 과정에서 원본 비율이 왜곡되지 않도록 하며, 다양한 크기와 매체에서도 동일한 시각적 무게감을 유지합니다.';
  const clearCopy = '로고 주변에는 일정한 보호 공간(Clear Space)을 확보해야 합니다. 텍스트, 이미지 및 기타 그래픽 요소와의 시각적 간섭을 방지하고 로고의 명확한 인지성을 유지하기 위한 기준입니다.';
  const minCopy = '로고는 사용 환경에 관계없이 충분한 가독성과 식별성을 유지해야 합니다. 지정된 최소 사용 크기 이하에서는 로고를 사용하지 않는 것을 원칙으로 합니다.';
  const monoCopy = '단색 로고는 컬러 사용이 제한되는 환경에서도 브랜드의 형태와 인지성을 일관되게 유지하기 위한 규정입니다. 흑백 인쇄 및 단색 디지털 환경에서는 지정된 Black 또는 White 버전을 사용합니다.';
  const colorCopy = project.description ? `브랜드 컬러는 ${brandName}의 성격과 인상을 시각적으로 전달하는 핵심 요소입니다. ${project.description} 지정된 컬러값을 기준으로 사용하여 다양한 매체에서 동일한 브랜드 이미지를 유지합니다.` : `브랜드 컬러는 ${brandName}의 성격과 톤앤매너를 시각적으로 전달하는 핵심 요소입니다. 지정된 컬러값을 기준으로 사용하여 인쇄와 디지털 환경에서 일관된 브랜드 이미지를 유지합니다.`;
  const combinationCopy = '컬러 조합은 브랜드 컬러와 로고의 관계를 명확하게 정의합니다. 배경과 로고 사이에 충분한 대비를 확보하고, 지정된 조합을 우선 사용하여 브랜드의 시각적 일관성을 유지합니다.';
  const usageCopy = '배경 컬러에 따라 로고의 가독성이 달라질 수 있으므로 지정된 사용 기준을 따릅니다. 식별성이 떨어지는 조합은 사용을 피하고 충분한 대비가 확보되는 컬러 조합을 우선 적용합니다.';
  const titleCopy = `제목용 서체는 브랜드의 첫인상과 정보 위계를 형성하는 주요 요소입니다. ${project.typography.title || 'Pretendard'}를 제목 서체로 사용하며, 주요 타이틀과 강조 정보에 일관되게 적용합니다.`;
  const bodyCopy = `본문용 서체는 다양한 정보가 명확하고 편안하게 전달될 수 있도록 높은 가독성을 기준으로 사용합니다. ${project.typography.body || 'Pretendard'}를 기본 본문 서체로 사용하여 인쇄와 디지털 환경에서 동일한 정보 체계를 유지합니다.`;

  const pages: GuidelinePage[] = [];
  const add = (page: GuidelinePage) => pages.push(page);

  add({ id: '01-cover', section: 'intro', title: 'Cover', subtitle: '', svg: `${openSvg(project, primary)}<text x="105" y="285" fill="${coverFg}" font-size="330" font-weight="700">Brand Guidelines</text>${logo(project.logo, 105, 1450, 650, 210, coverFg)}<text x="2240" y="1550" fill="${coverFg}" font-size="54" font-weight="700">${esc(project.year)}</text><text x="2240" y="1620" fill="${coverFg}" opacity=".74" font-size="28">${esc(brandName)}</text><text x="2240" y="1670" fill="${coverFg}" opacity=".74" font-size="24">${esc(project.slogan || 'Visual Identity Guidelines')}</text></svg>` });

  const indexFg = contrast(primary);
  add({ id: '02-index', section: 'intro', title: 'INDEX', subtitle: '', svg: `${openSvg(project, primary)}<text x="105" y="255" fill="${indexFg}" font-size="225" font-weight="700">INDEX</text><g fill="${indexFg}"><text x="1930" y="365" font-size="48" font-weight="700">LOGO</text><text x="2280" y="365" font-size="46">Signature logo</text><text x="2280" y="430" font-size="46">Grid system 1</text><text x="2280" y="495" font-size="46">Grid system 2</text><text x="2280" y="560" font-size="46">Clear space 1</text><text x="2280" y="625" font-size="46">Clear space 2</text><text x="2280" y="690" font-size="46">Minimum size</text><line x1="1930" y1="760" x2="2865" y2="760" stroke="${indexFg}" opacity=".55"/><text x="1930" y="865" font-size="48" font-weight="700">COLOR</text><text x="2280" y="865" font-size="46">Monochromatic</text><text x="2280" y="930" font-size="46">Brand color</text><text x="2280" y="995" font-size="46">Combinations</text><text x="2280" y="1060" font-size="46">Usage</text><line x1="1930" y1="1130" x2="2865" y2="1130" stroke="${indexFg}" opacity=".55"/><text x="1930" y="1235" font-size="48" font-weight="700">TYPOGRAPHY</text><text x="2280" y="1235" font-size="46">Title text</text><text x="2280" y="1300" font-size="46">Body text</text></g>${footer(project, 'Index', true)}</svg>` });

  add({ id: '03-logo-section', section: 'logo', title: 'LOGO', subtitle: '', svg: sectionCover(project, 'LOGO', '01', ['Signature logo', 'Grid system 1', 'Grid system 2', 'Clear space 1', 'Clear space 2', 'Minimum size']) });

  const signatureTop = { x: 1035, y: 460, w: 1830, h: 620 };
  const signatureBottomY = 1114;
  add({ id: '04-signature-logo', section: 'logo', title: 'LOGO', subtitle: 'Signature logo', svg: commonPage(project, 'LOGO', 'Signature logo', logoCopy, `<rect x="${signatureTop.x}" y="${signatureTop.y}" width="${signatureTop.w}" height="${signatureTop.h}" fill="${SOFT}"/>${label('PRIMARY', 1075, 520)}${logo(project.logo, 1350, 650, 1200, 330)}<rect x="1035" y="${signatureBottomY}" width="898" height="520" fill="${SOFT}"/>${label('MONOCHROME', 1075, signatureBottomY + 60)}${logo(project.logo, 1210, signatureBottomY + 145, 550, 230, BLACK)}<rect x="1967" y="${signatureBottomY}" width="898" height="520" fill="${primary}"/>${label('REVERSE', 2007, signatureBottomY + 60, contrast(primary))}${logo(project.logo, 2142, signatureBottomY + 145, 550, 230, contrast(primary))}`) });

  const gridBox = { x: 1125, y: 610, w: 1650, h: 760 };
  const gridLogo = fitLogo(project.logo, gridBox.x + 180, gridBox.y + 150, gridBox.w - 360, gridBox.h - 300);
  add({ id: '05-grid-system-1', section: 'logo', title: 'LOGO', subtitle: 'Grid system 1', svg: commonPage(project, 'LOGO', 'Grid system 1', gridCopy, `<rect x="1035" y="460" width="1830" height="1110" fill="${SOFT}"/>${logo(project.logo, gridLogo.x, gridLogo.y, gridLogo.width, gridLogo.height)}<line x1="1035" y1="${gridLogo.y}" x2="2865" y2="${gridLogo.y}" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/><line x1="1035" y1="${gridLogo.y + gridLogo.height}" x2="2865" y2="${gridLogo.y + gridLogo.height}" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/><line x1="${gridLogo.x}" y1="540" x2="${gridLogo.x}" y2="1470" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/><line x1="${gridLogo.x + gridLogo.width}" y1="540" x2="${gridLogo.x + gridLogo.width}" y2="1470" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/>${measurementLine(gridLogo.x, 1430, gridLogo.x + gridLogo.width, 1430, `${ratioText}X`, gridLogo.x + gridLogo.width / 2, 1490)}${measurementLine(2770, gridLogo.y, 2770, gridLogo.y + gridLogo.height, '1X', 2812, gridLogo.y + gridLogo.height / 2 + 8)}`) });

  const smallGrid = fitLogo(project.logo, 1320, 640, 1280, 400, 30);
  const miniGrid = fitLogo(project.logo, 1480, 1190, 960, 260, 20);
  add({ id: '06-grid-system-2', section: 'logo', title: 'LOGO', subtitle: 'Grid system 2', svg: commonPage(project, 'LOGO', 'Grid system 2', gridCopy, `<rect x="1035" y="460" width="1830" height="520" fill="${SOFT}"/>${logo(project.logo, smallGrid.x, smallGrid.y, smallGrid.width, smallGrid.height)}<line x1="1035" y1="${smallGrid.y}" x2="2865" y2="${smallGrid.y}" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/><line x1="1035" y1="${smallGrid.y + smallGrid.height}" x2="2865" y2="${smallGrid.y + smallGrid.height}" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/>${measurementLine(smallGrid.x, 930, smallGrid.x + smallGrid.width, 930, `${ratioText}X`, smallGrid.x + smallGrid.width / 2, 970)}<rect x="1035" y="1014" width="1830" height="520" fill="${SOFT}"/>${logo(project.logo, miniGrid.x, miniGrid.y, miniGrid.width, miniGrid.height)}<line x1="1035" y1="${miniGrid.y}" x2="2865" y2="${miniGrid.y}" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/><line x1="1035" y1="${miniGrid.y + miniGrid.height}" x2="2865" y2="${miniGrid.y + miniGrid.height}" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="10 9"/>`) });

  const clearLogo = fitLogo(project.logo, 1430, 795, 1040, 360, 20);
  const clearSpacePx = Math.max(55, clearLogo.height * clear);
  const outerX = clearLogo.x - clearSpacePx;
  const outerY = clearLogo.y - clearSpacePx;
  const outerW = clearLogo.width + clearSpacePx * 2;
  const outerH = clearLogo.height + clearSpacePx * 2;
  add({ id: '07-clear-space-1', section: 'logo', title: 'LOGO', subtitle: 'Clear space 1', svg: commonPage(project, 'LOGO', 'Clear space 1', clearCopy, `<rect x="1035" y="460" width="1830" height="1110" fill="${SOFT}"/><rect x="${outerX}" y="${outerY}" width="${outerW}" height="${outerH}" fill="none" stroke="${LINE}" stroke-width="2"/><rect x="${outerX}" y="${outerY}" width="${outerW}" height="${clearSpacePx}" fill="#E7E7E7"/><rect x="${outerX}" y="${outerY + outerH - clearSpacePx}" width="${outerW}" height="${clearSpacePx}" fill="#E7E7E7"/><rect x="${outerX}" y="${outerY + clearSpacePx}" width="${clearSpacePx}" height="${outerH - clearSpacePx * 2}" fill="#E7E7E7"/><rect x="${outerX + outerW - clearSpacePx}" y="${outerY + clearSpacePx}" width="${clearSpacePx}" height="${outerH - clearSpacePx * 2}" fill="#E7E7E7"/>${logo(project.logo, clearLogo.x, clearLogo.y, clearLogo.width, clearLogo.height)}${measurementLine(outerX, outerY - 38, clearLogo.x, outerY - 38, `${clear}X`, outerX + clearSpacePx / 2, outerY - 55)}${measurementLine(clearLogo.x + clearLogo.width, outerY - 38, outerX + outerW, outerY - 38, `${clear}X`, clearLogo.x + clearLogo.width + clearSpacePx / 2, outerY - 55)}`) });

  const clearSmall = fitLogo(project.logo, 1510, 640, 900, 280, 20);
  const clearMini = fitLogo(project.logo, 1650, 1190, 620, 190, 15);
  add({ id: '08-clear-space-2', section: 'logo', title: 'LOGO', subtitle: 'Clear space 2', svg: commonPage(project, 'LOGO', 'Clear space 2', clearCopy, `<rect x="1035" y="460" width="1830" height="520" fill="${SOFT}"/><rect x="${clearSmall.x - clearSmall.height * clear}" y="${clearSmall.y - clearSmall.height * clear}" width="${clearSmall.width + clearSmall.height * clear * 2}" height="${clearSmall.height + clearSmall.height * clear * 2}" fill="none" stroke="${LINE}" stroke-width="2"/>${logo(project.logo, clearSmall.x, clearSmall.y, clearSmall.width, clearSmall.height)}${label(`${clear}X`, clearSmall.x + clearSmall.width + 35, clearSmall.y + 25, GUIDE)}<rect x="1035" y="1014" width="1830" height="520" fill="${SOFT}"/><rect x="${clearMini.x - clearMini.height * clear}" y="${clearMini.y - clearMini.height * clear}" width="${clearMini.width + clearMini.height * clear * 2}" height="${clearMini.height + clearMini.height * clear * 2}" fill="none" stroke="${LINE}" stroke-width="2"/>${logo(project.logo, clearMini.x, clearMini.y, clearMini.width, clearMini.height)}${label(`${clear}X`, clearMini.x + clearMini.width + 35, clearMini.y + 25, GUIDE)}`) });

  add({ id: '09-minimum-size', section: 'logo', title: 'LOGO', subtitle: 'Minimum size', svg: commonPage(project, 'LOGO', 'Minimum size', minCopy, `<rect x="1035" y="460" width="1830" height="520" fill="${SOFT}"/>${label('PRIMARY LOGO', 1075, 520)}${logo(project.logo, 1635, 620, 630, 190)}<text x="2300" y="775" fill="${BLACK}" font-size="28">${project.rules.minimumPrintMm}mm / ${project.rules.minimumDigitalPx}px</text><rect x="1035" y="1014" width="898" height="520" fill="${SOFT}"/>${label('PRINT', 1075, 1074)}${logo(project.logo, 1300, 1175, 370, 130)}<text x="1484" y="1410" fill="${BLACK}" font-size="28" text-anchor="middle">${project.rules.minimumPrintMm} mm</text><rect x="1967" y="1014" width="898" height="520" fill="${SOFT}"/>${label('DIGITAL', 2007, 1074)}${logo(project.logo, 2232, 1175, 370, 130)}<text x="2416" y="1410" fill="${BLACK}" font-size="28" text-anchor="middle">${project.rules.minimumDigitalPx} px</text>`) });

  add({ id: '10-color-section', section: 'color', title: 'COLOR', subtitle: '', svg: sectionCover(project, 'COLOR', '02', ['Monochromatic', 'Brand color', 'Combinations', 'Usage']) });

  add({ id: '11-monochromatic', section: 'color', title: 'COLOR', subtitle: 'Monochromatic', svg: commonPage(project, 'COLOR', 'Monochromatic', monoCopy, `<rect x="1035" y="460" width="898" height="1110" fill="${WHITE}" stroke="${LINE}" stroke-width="2"/>${label('BLACK', 1075, 520)}${logo(project.logo, 1205, 835, 560, 280, BLACK)}<rect x="1967" y="460" width="898" height="1110" fill="#242021"/>${label('WHITE', 2007, 520, WHITE)}${logo(project.logo, 2137, 835, 560, 280, WHITE)}`) });

  add({ id: '12-brand-color', section: 'color', title: 'COLOR', subtitle: 'Brand color', svg: commonPage(project, 'COLOR', 'Brand color', colorCopy, `${swatch(project, primary, 1035, 'PRIMARY')}${swatch(project, secondary, 1630, 'SECONDARY')}${swatch(project, accent, 2225, 'ACCENT')}`) });

  add({ id: '13-color-combination', section: 'color', title: 'COLOR', subtitle: 'Combinations', svg: commonPage(project, 'COLOR', 'Combinations', combinationCopy, `${colorCell(project, primary, contrast(primary), 1035, 460, 898, 350, 'PRIMARY')}${colorCell(project, WHITE, primary, 1967, 460, 898, 350, 'WHITE')}${colorCell(project, '#242021', WHITE, 1035, 844, 898, 350, 'BLACK')}${colorCell(project, WHITE, BLACK, 1967, 844, 898, 350, 'MONO')}${colorCell(project, secondary, accent, 1035, 1228, 898, 350, 'SECONDARY')}${colorCell(project, accent, primary, 1967, 1228, 898, 350, 'ACCENT')}`) });

  const backgrounds = [WHITE, primary, secondary, accent, '#242021'];
  const logoColors = [primary, WHITE, BLACK, accent];
  const cellW = 366;
  const cellH = 210;
  const gridX = 1035;
  const gridY = 520;
  let usageGrid = '';
  backgrounds.forEach((bg, row) => {
    logoColors.forEach((logoColor, col) => {
      usageGrid += usageCell(project, bg, logoColor, gridX + col * cellW, gridY + row * cellH, cellW, cellH);
    });
  });
  add({ id: '14-color-usage', section: 'color', title: 'COLOR', subtitle: 'Usage', svg: commonPage(project, 'COLOR', 'Usage', usageCopy, `${label('LOGO COLOR →', 1035, 475)}${label('PRIMARY', 1080, 505)}${label('WHITE', 1446, 505)}${label('BLACK', 1812, 505)}${label('ACCENT', 2178, 505)}${usageGrid}`) });

  add({ id: '15-typography-section', section: 'typography', title: 'TYPOGRAPHY', subtitle: '', svg: sectionCover(project, 'TYPOGRAPHY', '03', ['Title text', 'Body text']) });

  const titleFont = project.typography.title || 'Pretendard';
  add({ id: '16-title-typeface', section: 'typography', title: 'TYPOGRAPHY', subtitle: 'Title text', svg: commonPage(project, 'TYPOGRAPHY', 'Title text', titleCopy, `<rect x="1035" y="460" width="1830" height="1110" fill="${SOFT}"/>${typographySample(project, titleFont, 1180, 760, true)}`) });

  const bodyFont = project.typography.body || 'Pretendard';
  add({ id: '17-body-typeface', section: 'typography', title: 'TYPOGRAPHY', subtitle: 'Body text', svg: commonPage(project, 'TYPOGRAPHY', 'Body text', bodyCopy, `<rect x="1035" y="460" width="1830" height="1110" fill="${SOFT}"/>${typographySample(project, bodyFont, 1180, 710, false)}<g style="font-family:${fontStack(bodyFont)}"><text x="1180" y="1240" fill="${BLACK}" font-size="42" font-weight="700">국문</text><text x="1180" y="1325" fill="${BLACK}" font-size="42">가나다라마바사아자차카타파하</text><text x="1180" y="1390" fill="${BLACK}" font-size="42">가나다라마바사아자차카타파하</text><text x="2620" y="1210" fill="${BLACK}" font-size="34" text-anchor="end" font-weight="700">Black</text><text x="2620" y="1262" fill="${BLACK}" font-size="34" text-anchor="end" font-weight="700">Bold</text><text x="2620" y="1314" fill="${BLACK}" font-size="34" text-anchor="end" font-weight="600">SemiBold</text><text x="2620" y="1366" fill="${BLACK}" font-size="34" text-anchor="end" font-weight="500">Medium</text><text x="2620" y="1418" fill="${BLACK}" font-size="34" text-anchor="end" font-weight="400">Regular</text><text x="2620" y="1470" fill="${MUTED}" font-size="34" text-anchor="end" font-weight="300">Light</text></g>`) });

  add({ id: '18-back-cover', section: 'end', title: 'Back Cover', subtitle: '', svg: `${openSvg(project, primary)}${logo(project.logo, 1035, 780, 900, 540, coverFg)}<text x="1485" y="1450" fill="${coverFg}" opacity=".78" font-size="28" text-anchor="middle">${esc(project.slogan || brandName)}</text></svg>` });

  return pages;
}
