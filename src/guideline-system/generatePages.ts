import type { BrandProject, GuidelinePage, LogoAsset } from '../types/guideline';
import { documentTokens as T } from './documentTokens';

const W = T.width;
const H = T.height;
const BLACK = '#111111';
const WHITE = '#FFFFFF';
const MUTED = '#767676';
const LINE = '#D9D9D9';

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

function contrast(hex: string): string {
  const [r, g, b] = hexRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? BLACK : WHITE;
}

function wrap(text: string, max = 35): string[] {
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
  return lines.slice(0, 7);
}

function textBlock(text: string, x: number, y: number, widthChars = 34, fill = BLACK): string {
  const lines = wrap(text, widthChars);
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="34" font-weight="400">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : 56}">${esc(line)}</tspan>`)
    .join('')}</text>`;
}

function fontStyle(project: BrandProject): string {
  const body = esc(project.typography.body || 'Pretendard');
  return `font-family:${body},Pretendard,'Noto Sans KR',Arial,sans-serif`;
}

function openSvg(project: BrandProject, background = WHITE): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 ${W} ${H}" style="${fontStyle(project)}"><rect width="${W}" height="${H}" fill="${background}"/>`;
}

function footer(project: BrandProject, section: string, inverted = false): string {
  const color = inverted ? 'rgba(255,255,255,.72)' : MUTED;
  const line = inverted ? 'rgba(255,255,255,.28)' : LINE;
  return `<line x1="105" y1="1895" x2="2865" y2="1895" stroke="${line}" stroke-width="2"/><text x="105" y="1970" fill="${color}" font-size="22" font-weight="600">${esc(project.name || 'Brand')}</text><text x="1485" y="1970" fill="${color}" font-size="22" text-anchor="middle">${esc(section)}</text><text x="2865" y="1970" fill="${color}" font-size="22" text-anchor="end">Brand Guidelines</text>`;
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
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${LINE}" stroke-width="2"/><text x="${x + width / 2}" y="${y + height / 2}" fill="${MUTED}" font-size="36" text-anchor="middle">LOGO SVG</text>`;
  }
  const inner = color ? recolorInner(asset.inner, color) : asset.inner;
  const v = asset.viewBox;
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

function commonPage(project: BrandProject, title: string, subtitle: string, description: string, content: string): string {
  const primary = safeHex(project.colors.primary);
  return `${openSvg(project)}<text x="105" y="135" fill="${primary}" font-size="82" font-weight="700">${esc(title)}</text><text x="1035" y="135" fill="${primary}" font-size="34" font-weight="500">${esc(subtitle)}</text><line x1="105" y1="209" x2="2865" y2="209" stroke="${primary}" stroke-width="3"/>${textBlock(description, 105, 500)}${content}${footer(project, title)}</svg>`;
}

function sectionCover(project: BrandProject, section: string, number: string, items: string[]): string {
  const bg = safeHex(project.colors.primary);
  const fg = contrast(bg);
  const itemMarkup = items.map((item, index) => `<text x="2150" y="${360 + index * 70}" fill="${fg}" font-size="50" font-weight="500">${esc(item)}</text>`).join('');
  return `${openSvg(project, bg)}<text x="105" y="1760" fill="${fg}" font-size="220" font-weight="700">${esc(section)}</text><text x="1920" y="360" fill="${fg}" opacity=".34" font-size="190" font-weight="700">${number}</text>${itemMarkup}${footer(project, section, true)}</svg>`;
}

function swatch(project: BrandProject, color: string, x: number, label: string): string {
  const hex = safeHex(color, '#777777');
  const [r, g, b] = hexRgb(hex);
  const [c, m, y, k] = rgbToCmyk(hex);
  return `<rect x="${x}" y="500" width="560" height="620" fill="${hex}"/><text x="${x}" y="1195" fill="${BLACK}" font-size="34" font-weight="700">${esc(label)}</text><text x="${x}" y="1260" fill="${BLACK}" font-size="30">HEX  ${hex}</text><text x="${x}" y="1310" fill="${MUTED}" font-size="28">RGB  ${r} / ${g} / ${b}</text><text x="${x}" y="1360" fill="${MUTED}" font-size="28">CMYK  ${c} / ${m} / ${y} / ${k}</text>`;
}

export function generateGuidelinePages(project: BrandProject): GuidelinePage[] {
  const primary = safeHex(project.colors.primary);
  const secondary = safeHex(project.colors.secondary, '#EAEAEA');
  const accent = safeHex(project.colors.accent, '#777777');
  const coverFg = contrast(primary);
  const ratio = project.logo?.aspectRatio ?? 1;
  const ratioText = ratio.toFixed(2);
  const clear = Math.max(0.1, project.rules.clearSpace || 0.25);
  const baseDescription = project.description || '브랜드의 시각적 일관성을 유지하기 위한 기본 가이드라인입니다.';

  const pages: GuidelinePage[] = [];
  const add = (page: GuidelinePage) => pages.push(page);

  add({ id: '01-cover', section: 'intro', title: 'Cover', subtitle: '', svg: `${openSvg(project, primary)}<text x="105" y="260" fill="${coverFg}" font-size="235" font-weight="700">Brand</text><text x="105" y="475" fill="${coverFg}" font-size="235" font-weight="700">Guidelines</text>${logo(project.logo, 105, 1240, 1100, 330, coverFg)}<text x="2865" y="1490" fill="${coverFg}" font-size="54" text-anchor="end" font-weight="700">${esc(project.year)}</text><text x="2865" y="1560" fill="${coverFg}" opacity=".75" font-size="28" text-anchor="end">${esc(project.name)}</text></svg>` });

  add({ id: '02-index', section: 'intro', title: 'INDEX', subtitle: '', svg: `${openSvg(project)}<text x="105" y="250" fill="${BLACK}" font-size="215" font-weight="700">INDEX</text><line x1="1035" y1="360" x2="2865" y2="360" stroke="${LINE}" stroke-width="2"/><text x="1035" y="480" fill="${BLACK}" font-size="56" font-weight="700">01  LOGO</text><text x="1950" y="480" fill="${MUTED}" font-size="38">Signature / Grid / Clear Space / Minimum Size</text><line x1="1035" y1="570" x2="2865" y2="570" stroke="${LINE}"/><text x="1035" y="700" fill="${BLACK}" font-size="56" font-weight="700">02  COLOR</text><text x="1950" y="700" fill="${MUTED}" font-size="38">Monochrome / Brand Color / Combination / Usage</text><line x1="1035" y1="790" x2="2865" y2="790" stroke="${LINE}"/><text x="1035" y="920" fill="${BLACK}" font-size="56" font-weight="700">03  TYPOGRAPHY</text><text x="1950" y="920" fill="${MUTED}" font-size="38">Title Typeface / Body Typeface</text>${footer(project, 'Index')}</svg>` });

  add({ id: '03-logo-section', section: 'logo', title: 'LOGO', subtitle: '', svg: sectionCover(project, 'LOGO', '01', ['Signature logo', 'Grid system 1', 'Grid system 2', 'Clear space 1', 'Clear space 2', 'Minimum size']) });

  add({ id: '04-signature-logo', section: 'logo', title: 'LOGO', subtitle: 'Signature logo', svg: commonPage(project, 'LOGO', 'Signature logo', `시그니처 로고는 ${project.name || '브랜드'}를 대표하는 핵심 시각 자산입니다. 형태와 비율을 임의로 변경하지 않고 공식 커뮤니케이션에서 일관되게 사용합니다.`, `<rect x="1035" y="460" width="1830" height="1080" fill="#F7F7F7"/>${logo(project.logo, 1280, 780, 1340, 420)}`) });

  add({ id: '05-grid-system-1', section: 'logo', title: 'LOGO', subtitle: 'Grid system 1', svg: commonPage(project, 'LOGO', 'Grid system 1', '그리드 시스템은 로고의 비례와 정렬 기준을 명확하게 정의합니다. 로고를 재현하거나 크기를 변경할 때 원본 비율을 유지하여 동일한 시각적 무게감을 확보합니다.', `<line x1="1200" y1="680" x2="2700" y2="680" stroke="${primary}" stroke-dasharray="12 12"/><line x1="1200" y1="1250" x2="2700" y2="1250" stroke="${primary}" stroke-dasharray="12 12"/>${logo(project.logo, 1320, 760, 1260, 400)}<text x="1950" y="1370" fill="${primary}" font-size="32" text-anchor="middle">W : H = ${ratioText} : 1</text>`) });

  add({ id: '06-grid-system-2', section: 'logo', title: 'LOGO', subtitle: 'Grid system 2', svg: commonPage(project, 'LOGO', 'Grid system 2', '기본 높이를 1X로 설정하고 로고의 전체 너비를 비례값으로 표현합니다. 다양한 매체에서도 동일한 기준을 적용해 왜곡 없는 재현이 가능하도록 합니다.', `<rect x="1280" y="690" width="1340" height="610" fill="none" stroke="${LINE}" stroke-width="2"/>${logo(project.logo, 1400, 800, 1100, 390)}<line x1="1280" y1="1370" x2="2620" y2="1370" stroke="${primary}" stroke-width="3"/><text x="1950" y="1430" fill="${primary}" font-size="32" text-anchor="middle">${ratioText}X</text><line x1="2690" y1="690" x2="2690" y2="1300" stroke="${primary}" stroke-width="3"/><text x="2740" y="1010" fill="${primary}" font-size="32">1X</text>`) });

  add({ id: '07-clear-space-1', section: 'logo', title: 'LOGO', subtitle: 'Clear space 1', svg: commonPage(project, 'LOGO', 'Clear space 1', '로고 주변에는 일정한 보호 공간(Clear Space)을 확보합니다. 다른 텍스트나 그래픽 요소가 해당 영역을 침범하지 않도록 하여 로고의 명확한 인지성을 유지합니다.', `<rect x="1240" y="650" width="1420" height="720" fill="#FAFAFA" stroke="${primary}" stroke-width="2" stroke-dasharray="12 12"/>${logo(project.logo, 1450, 820, 1000, 360)}<text x="1950" y="1450" fill="${primary}" font-size="32" text-anchor="middle">Clear Space = ${clear}X</text>`) });

  add({ id: '08-clear-space-2', section: 'logo', title: 'LOGO', subtitle: 'Clear space 2', svg: commonPage(project, 'LOGO', 'Clear space 2', '보호 공간은 로고 높이를 기준 단위 X로 설정하여 계산합니다. 실제 적용 환경에서는 제시된 최소 공간보다 넓게 사용하는 것을 권장합니다.', `<rect x="1320" y="720" width="1260" height="580" fill="none" stroke="${primary}" stroke-width="3" stroke-dasharray="16 12"/>${logo(project.logo, 1500, 850, 900, 320)}<text x="1280" y="690" fill="${primary}" font-size="30">${clear}X</text><text x="2600" y="690" fill="${primary}" font-size="30" text-anchor="end">${clear}X</text>`) });

  add({ id: '09-minimum-size', section: 'logo', title: 'LOGO', subtitle: 'Minimum size', svg: commonPage(project, 'LOGO', 'Minimum size', '로고는 사용 환경에 관계없이 충분한 가독성과 식별성을 유지해야 합니다. 지정된 최소 크기 이하에서는 사용하지 않는 것을 원칙으로 합니다.', `${logo(project.logo, 1140, 650, 900, 300)}<text x="1140" y="1020" fill="${BLACK}" font-size="34" font-weight="700">Print</text><text x="1140" y="1080" fill="${MUTED}" font-size="30">Minimum ${project.rules.minimumPrintMm} mm</text>${logo(project.logo, 2200, 720, 500, 180)}<text x="2200" y="1020" fill="${BLACK}" font-size="34" font-weight="700">Digital</text><text x="2200" y="1080" fill="${MUTED}" font-size="30">Minimum ${project.rules.minimumDigitalPx} px</text>`) });

  add({ id: '10-color-section', section: 'color', title: 'COLOR', subtitle: '', svg: sectionCover(project, 'COLOR', '02', ['Monochromatic', 'Brand color', 'Color combinations', 'Color usage']) });

  add({ id: '11-monochromatic', section: 'color', title: 'COLOR', subtitle: 'Monochromatic', svg: commonPage(project, 'COLOR', 'Monochromatic', '단색 로고는 컬러 사용이 제한되는 환경에서 브랜드를 명확하게 표현하기 위한 기본 규정입니다. Black과 White 버전을 우선 사용하여 시각적 일관성을 유지합니다.', `<rect x="1035" y="460" width="900" height="1040" fill="${WHITE}" stroke="${LINE}"/><rect x="1965" y="460" width="900" height="1040" fill="${BLACK}"/>${logo(project.logo, 1210, 800, 550, 260, BLACK)}${logo(project.logo, 2140, 800, 550, 260, WHITE)}<text x="1485" y="1380" fill="${BLACK}" font-size="30" text-anchor="middle">BLACK</text><text x="2415" y="1380" fill="${WHITE}" font-size="30" text-anchor="middle">WHITE</text>`) });

  add({ id: '12-brand-color', section: 'color', title: 'COLOR', subtitle: 'Brand color', svg: commonPage(project, 'COLOR', 'Brand color', `브랜드 컬러는 ${project.name || '브랜드'}의 성격과 톤앤매너를 시각적으로 전달하는 핵심 요소입니다. 지정된 컬러값을 기준으로 사용하여 매체에 따른 색상 편차를 최소화합니다.`, `${swatch(project, primary, 1035, 'PRIMARY')}${swatch(project, secondary, 1668, 'SECONDARY')}${swatch(project, accent, 2301, 'ACCENT')}`) });

  const comboColors = [primary, secondary, accent, BLACK];
  add({ id: '13-color-combination', section: 'color', title: 'COLOR', subtitle: 'Color combinations', svg: commonPage(project, 'COLOR', 'Color combinations', '컬러 조합은 메인 컬러와 보조 컬러를 함께 사용하여 브랜드의 시각적 확장성을 확보합니다. 배경과 로고 사이에 충분한 대비가 유지되는 조합을 우선 사용합니다.', comboColors.map((color, index) => { const x = 1035 + (index % 2) * 915; const y = 460 + Math.floor(index / 2) * 520; return `<rect x="${x}" y="${y}" width="880" height="480" fill="${color}"/>${logo(project.logo, x + 165, y + 150, 550, 170, contrast(color))}`; }).join('')) });

  add({ id: '14-color-usage', section: 'color', title: 'COLOR', subtitle: 'Color usage', svg: commonPage(project, 'COLOR', 'Color usage', '브랜드 컬러는 역할과 정보 위계에 따라 구분하여 사용합니다. Primary 컬러를 중심으로 Secondary와 Accent 컬러를 보조적으로 적용해 일관된 인상을 유지합니다.', `<text x="1035" y="560" fill="${BLACK}" font-size="34" font-weight="700">Recommended proportion</text><rect x="1035" y="660" width="1280" height="260" fill="${primary}"/><rect x="2315" y="660" width="365" height="260" fill="${secondary}"/><rect x="2680" y="660" width="185" height="260" fill="${accent}"/><text x="1035" y="1010" fill="${MUTED}" font-size="30">Primary 70%</text><text x="1668" y="1010" fill="${MUTED}" font-size="30">Secondary 20%</text><text x="2301" y="1010" fill="${MUTED}" font-size="30">Accent 10%</text>`) });

  add({ id: '15-typography-section', section: 'typography', title: 'TYPOGRAPHY', subtitle: '', svg: sectionCover(project, 'TYPOGRAPHY', '03', ['Title text', 'Body text']) });

  const titleFont = project.typography.title || 'Pretendard';
  const bodyFont = project.typography.body || 'Pretendard';
  add({ id: '16-title-typeface', section: 'typography', title: 'TYPOGRAPHY', subtitle: 'Title text', svg: commonPage(project, 'TYPOGRAPHY', 'Title text', `제목용 서체는 브랜드의 첫인상을 형성하는 중요한 시각 요소입니다. ${titleFont}을 기본 제목 서체로 사용하며 주요 제목과 강조 문구에 일관되게 적용합니다.`, `<text x="1035" y="650" fill="${BLACK}" font-size="72" font-weight="700" style="font-family:${esc(titleFont)},sans-serif">${esc(titleFont)}</text><text x="1035" y="850" fill="${BLACK}" font-size="74" font-weight="700" style="font-family:${esc(titleFont)},sans-serif">ABCDEFGHIJKLMNOPQRSTUVWXYZ</text><text x="1035" y="980" fill="${BLACK}" font-size="70" style="font-family:${esc(titleFont)},sans-serif">abcdefghijklmnopqrstuvwxyz 0123456789</text><text x="1035" y="1160" fill="${BLACK}" font-size="68" style="font-family:${esc(titleFont)},sans-serif">가나다라마바사아자차카타파하</text>`) });

  add({ id: '17-body-typeface', section: 'typography', title: 'TYPOGRAPHY', subtitle: 'Body text', svg: commonPage(project, 'TYPOGRAPHY', 'Body text', `본문용 서체는 다양한 정보가 명확하고 편안하게 전달될 수 있도록 높은 가독성을 기준으로 사용합니다. ${bodyFont}을 기본 본문 서체로 적용하여 인쇄 및 디지털 환경에서 동일한 정보 체계를 유지합니다.`, `<text x="1035" y="620" fill="${BLACK}" font-size="64" font-weight="600" style="font-family:${esc(bodyFont)},sans-serif">${esc(bodyFont)}</text><text x="1035" y="790" fill="${BLACK}" font-size="46" font-weight="700" style="font-family:${esc(bodyFont)},sans-serif">Bold  브랜드의 정보를 명확하게 전달합니다.</text><text x="1035" y="920" fill="${BLACK}" font-size="46" font-weight="600" style="font-family:${esc(bodyFont)},sans-serif">SemiBold  중요한 내용을 강조합니다.</text><text x="1035" y="1050" fill="${BLACK}" font-size="46" font-weight="500" style="font-family:${esc(bodyFont)},sans-serif">Medium  보조 제목과 인터페이스에 사용합니다.</text><text x="1035" y="1180" fill="${BLACK}" font-size="46" font-weight="400" style="font-family:${esc(bodyFont)},sans-serif">Regular  긴 본문과 설명에 사용합니다.</text>`) });

  add({ id: '18-back-cover', section: 'end', title: 'Back Cover', subtitle: '', svg: `${openSvg(project, primary)}${logo(project.logo, 1035, 810, 900, 330, coverFg)}<text x="1485" y="1320" fill="${coverFg}" font-size="34" text-anchor="middle">${esc(project.englishName || project.name)}</text><text x="1485" y="1390" fill="${coverFg}" opacity=".65" font-size="26" text-anchor="middle">Brand Guidelines · ${esc(project.year)}</text></svg>` });

  void baseDescription;
  return pages;
}
