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
  const brandName = project.name || project.englishName || 'Brand';
  const englishName = project.englishName || brandName;
  const ratio = project.logo?.aspectRatio && project.logo.aspectRatio > 0 ? project.logo.aspectRatio : 1;
  const ratioText = ratio.toFixed(2);
  const clear = Math.max(0.1, Math.min(2, project.rules.clearSpace || 0.25));

  const pages: GuidelinePage[] = [];
  const add = (page: GuidelinePage) => pages.push(page);

  const copy = {
    primary: `Primary Logo는 ${brandName}의 가장 핵심적인 시각 자산입니다. 모든 공식 커뮤니케이션에서 기본형을 우선 사용하며, 비율과 형태를 임의로 변경하지 않습니다.`,
    construction: '로고의 구조와 비례는 일관된 인상을 유지하기 위한 기준입니다. 원본 비율을 유지하고 기준선과 정렬축을 활용해 다양한 환경에서도 동일한 형태로 재현합니다.',
    variations: '사용 환경에 따라 Primary, Monochrome, Reverse 버전을 선택합니다. 배경 대비와 가독성을 우선하며 지정된 조합 외 임의의 컬러 변형은 지양합니다.',
    clear: `로고 주변에는 최소 ${clear}X의 보호 공간을 확보합니다. X는 로고 높이를 기준으로 하며, 보호 공간 안에는 텍스트·이미지·그래픽 요소가 침범하지 않도록 합니다.`,
    incorrect: '로고의 일관성을 위해 형태 왜곡, 임의 회전, 효과 적용, 비지정 컬러 사용을 금지합니다. 모든 사용 환경에서 원본 로고의 비례와 명료성을 유지합니다.',
    minimum: '작은 크기에서도 브랜드 인지가 유지되도록 최소 사용 크기를 준수합니다. 인쇄물과 디지털 환경에 각각 지정된 최소 기준 이하에서는 사용하지 않습니다.',
    color: `Brand Color는 ${brandName}의 인상을 형성하는 핵심 요소입니다. 지정된 HEX·RGB·CMYK 값을 기준으로 디지털과 인쇄 환경에서 동일한 컬러 경험을 유지합니다.`,
    colorSystem: 'Primary Color를 중심으로 Secondary와 Accent Color를 보조적으로 사용합니다. 넓은 면적은 Primary 중심, 정보 구분과 강조에는 보조 컬러를 제한적으로 적용합니다.',
    combination: '로고와 배경 컬러의 조합은 가독성과 브랜드 인지도를 기준으로 선택합니다. 충분한 명도 대비가 확보되는 조합을 우선 사용합니다.',
    usage: '컬러 사용 비율과 대비 규칙을 함께 적용해 화면과 인쇄물에서 안정적인 시각 위계를 유지합니다. 동일 화면에서 과도한 컬러 경쟁이 발생하지 않도록 합니다.',
    title: `Title Typeface는 ${project.typography.title || 'Pretendard'}를 사용합니다. 짧고 강한 메시지와 주요 헤드라인에 적용하며 일관된 크기·행간·자간 기준을 유지합니다.`,
    body: `Body Typeface는 ${project.typography.body || 'Pretendard'}를 사용합니다. 정보 전달과 장문 가독성을 우선하며 제목과 본문 사이에 명확한 위계를 형성합니다.`,
  };

  const leftMeta = (items: Array<[string, string]>) => items.map(([k, v], index) =>
    `<g transform="translate(105 ${1050 + index * 112})"><text x="0" y="0" fill="${MUTED}" font-size="24" font-weight="500">${esc(k.toUpperCase())}</text><text x="0" y="46" fill="${BLACK}" font-size="30" font-weight="600">${esc(v)}</text><line x1="0" y1="76" x2="720" y2="76" stroke="${LINE}" stroke-width="2"/></g>`
  ).join('');

  const panel = (x: number, y: number, w: number, h: number, fill = SOFT, stroke = 'none') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

  const cross = (x: number, y: number, w: number, h: number) =>
    `<line x1="${x + 18}" y1="${y + 18}" x2="${x + w - 18}" y2="${y + h - 18}" stroke="${ERROR}" stroke-width="6"/><line x1="${x + w - 18}" y1="${y + 18}" x2="${x + 18}" y2="${y + h - 18}" stroke="${ERROR}" stroke-width="6"/>`;

  const colorSpec = (hexValue: string, x: number, y: number, w: number, h: number, name: string) => {
    const hex = safeHex(hexValue);
    const [r, g, b] = hexRgb(hex);
    const [c, m, yy, k] = rgbToCmyk(hex);
    const fg = contrast(hex);
    return `${panel(x, y, w, h, hex)}<text x="${x + 28}" y="${y + 48}" fill="${fg}" font-size="24" font-weight="700">${esc(name)}</text><text x="${x + 28}" y="${y + h - 128}" fill="${fg}" font-size="26" font-weight="600">${hex}</text><text x="${x + 28}" y="${y + h - 82}" fill="${fg}" opacity=".82" font-size="21">RGB ${r} · ${g} · ${b}</text><text x="${x + 28}" y="${y + h - 42}" fill="${fg}" opacity=".82" font-size="21">CMYK ${c} · ${m} · ${yy} · ${k}</text>`;
  };

  const sectionIntro = (section: string, number: string, items: string[]) => {
    const itemMarkup = items.map((item, index) =>
      `<text x="2110" y="${390 + index * 72}" fill="${BLACK}" font-size="34" font-weight="500">${esc(String(index + 1).padStart(2, '0'))}</text><text x="2240" y="${390 + index * 72}" fill="${BLACK}" font-size="34">${esc(item)}</text>`
    ).join('');
    return `${openSvg(project, '#F1F1F3')}<text x="105" y="210" fill="${MUTED}" font-size="26" font-weight="600">${number} · BRAND IDENTITY SYSTEM</text><text x="105" y="1750" fill="${BLACK}" font-size="250" font-weight="700">${esc(section)}</text><line x1="2040" y1="300" x2="2865" y2="300" stroke="${BLACK}" stroke-width="3"/>${itemMarkup}${footer(project, section)}</svg>`;
  };

  // 01 Cover
  add({
    id: '01-cover',
    section: 'intro',
    title: 'Cover',
    subtitle: '',
    svg: `${openSvg(project, primary)}
      <text x="105" y="170" fill="${coverFg}" opacity=".74" font-size="24" font-weight="600">${esc(project.year)} · BRAND IDENTITY GUIDELINES</text>
      <text x="105" y="520" fill="${coverFg}" font-size="260" font-weight="700">Brand</text>
      <text x="105" y="760" fill="${coverFg}" font-size="260" font-weight="700">Guidelines</text>
      <line x1="105" y1="930" x2="2865" y2="930" stroke="${coverFg}" opacity=".28" stroke-width="2"/>
      ${logo(project.logo, 105, 1420, 620, 190, coverFg)}
      <text x="2200" y="1460" fill="${coverFg}" font-size="30" font-weight="600">${esc(englishName)}</text>
      <text x="2200" y="1520" fill="${coverFg}" opacity=".74" font-size="23">${esc(project.slogan || 'Visual Identity System')}</text>
      <text x="2200" y="1600" fill="${coverFg}" opacity=".55" font-size="20">VERSION 1.0 · ${esc(project.year)}</text>
    </svg>`
  });

  // 02 Index
  add({
    id: '02-index',
    section: 'intro',
    title: 'INDEX',
    subtitle: '',
    svg: `${openSvg(project)}
      <text x="105" y="245" fill="${BLACK}" font-size="190" font-weight="700">INDEX</text>
      <text x="105" y="355" fill="${MUTED}" font-size="28">Brand Identity Guidelines · ${esc(englishName)}</text>
      <line x1="105" y1="430" x2="2865" y2="430" stroke="${BLACK}" stroke-width="3"/>

      <text x="105" y="590" fill="${MUTED}" font-size="24" font-weight="700">01</text>
      <text x="190" y="590" fill="${BLACK}" font-size="48" font-weight="700">LOGO</text>
      <text x="190" y="675" fill="${BLACK}" font-size="30">04  Primary logo</text>
      <text x="190" y="730" fill="${BLACK}" font-size="30">05  Construction grid</text>
      <text x="190" y="785" fill="${BLACK}" font-size="30">06  Logo variations</text>
      <text x="190" y="840" fill="${BLACK}" font-size="30">07  Clear space</text>
      <text x="190" y="895" fill="${BLACK}" font-size="30">08  Incorrect usage</text>
      <text x="190" y="950" fill="${BLACK}" font-size="30">09  Minimum size</text>

      <text x="1050" y="590" fill="${MUTED}" font-size="24" font-weight="700">02</text>
      <text x="1135" y="590" fill="${BLACK}" font-size="48" font-weight="700">COLOR</text>
      <text x="1135" y="675" fill="${BLACK}" font-size="30">11  Brand color</text>
      <text x="1135" y="730" fill="${BLACK}" font-size="30">12  Color system</text>
      <text x="1135" y="785" fill="${BLACK}" font-size="30">13  Combinations</text>
      <text x="1135" y="840" fill="${BLACK}" font-size="30">14  Usage guide</text>

      <text x="2010" y="590" fill="${MUTED}" font-size="24" font-weight="700">03</text>
      <text x="2095" y="590" fill="${BLACK}" font-size="48" font-weight="700">TYPOGRAPHY</text>
      <text x="2095" y="675" fill="${BLACK}" font-size="30">16  Title text</text>
      <text x="2095" y="730" fill="${BLACK}" font-size="30">17  Body text</text>

      <rect x="105" y="1250" width="2760" height="460" fill="${SOFT}"/>
      <text x="145" y="1320" fill="${MUTED}" font-size="23" font-weight="700">DOCUMENT SYSTEM</text>
      <text x="145" y="1430" fill="${BLACK}" font-size="46" font-weight="700">A4 Landscape</text>
      <text x="1040" y="1430" fill="${BLACK}" font-size="46" font-weight="700">Vector SVG</text>
      <text x="1935" y="1430" fill="${BLACK}" font-size="46" font-weight="700">PDF Export</text>
      <text x="145" y="1510" fill="${MUTED}" font-size="25">297 × 210 mm</text>
      <text x="1040" y="1510" fill="${MUTED}" font-size="25">Editable artwork</text>
      <text x="1935" y="1510" fill="${MUTED}" font-size="25">Ready for delivery</text>
      ${footer(project, 'Index')}
    </svg>`
  });

  // 03 Logo section
  add({ id: '03-logo-section', section: 'logo', title: 'LOGO', subtitle: '', svg: sectionIntro('LOGO', '01', ['Primary logo', 'Construction grid', 'Logo variations', 'Clear space', 'Incorrect usage', 'Minimum size']) });

  // 04 Primary logo
  add({
    id: '04-signature-logo',
    section: 'logo',
    title: 'LOGO',
    subtitle: 'Primary logo',
    svg: commonPage(project, 'LOGO', 'Primary logo', copy.primary,
      `${leftMeta([['Role', 'Core brand asset'], ['Priority', 'Primary version first'], ['Rule', 'Do not redraw']])}
      ${panel(1035, 460, 1830, 720, WHITE, LINE)}
      ${label('PRIMARY LOGO', 1080, 520)}
      ${logo(project.logo, 1390, 660, 1120, 310)}
      ${panel(1035, 1215, 885, 330, primary)}
      ${label('REVERSE', 1075, 1270, contrast(primary))}
      ${logo(project.logo, 1240, 1330, 480, 140, contrast(primary))}
      ${panel(1955, 1215, 910, 330, '#F2F2F2')}
      ${label('MONOCHROME', 1995, 1270)}
      ${logo(project.logo, 2165, 1330, 480, 140, BLACK)}
      <text x="1035" y="1625" fill="${MUTED}" font-size="22">The primary logo should always be reproduced from approved master artwork.</text>`
    )
  });

  // 05 Construction grid
  const gridBox = { x: 1140, y: 610, w: 1600, h: 650 };
  const gridLogo = fitLogo(project.logo, gridBox.x + 180, gridBox.y + 150, gridBox.w - 360, gridBox.h - 300);
  add({
    id: '05-grid-system-1',
    section: 'logo',
    title: 'LOGO',
    subtitle: 'Construction grid',
    svg: commonPage(project, 'LOGO', 'Construction grid', copy.construction,
      `${leftMeta([['Base unit', 'X = Logo height'], ['Ratio', `${ratioText} : 1`], ['Alignment', 'Optical center']])}
      ${panel(1035, 460, 1830, 1040, '#FAFAFA', LINE)}
      <g opacity=".58">
        <line x1="1170" y1="540" x2="1170" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1370" y1="540" x2="1370" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1570" y1="540" x2="1570" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1770" y1="540" x2="1770" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1970" y1="540" x2="1970" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="2170" y1="540" x2="2170" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="2370" y1="540" x2="2370" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="2570" y1="540" x2="2570" y2="1400" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1080" y1="700" x2="2800" y2="700" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1080" y1="900" x2="2800" y2="900" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1080" y1="1100" x2="2800" y2="1100" stroke="${GUIDE}" stroke-width="2"/>
        <line x1="1080" y1="1300" x2="2800" y2="1300" stroke="${GUIDE}" stroke-width="2"/>
      </g>
      ${logo(project.logo, gridLogo.x, gridLogo.y, gridLogo.width, gridLogo.height)}
      ${measurementLine(gridLogo.x, 1360, gridLogo.x + gridLogo.width, 1360, `${ratioText}X`, gridLogo.x + gridLogo.width / 2, 1420)}
      ${measurementLine(2740, gridLogo.y, 2740, gridLogo.y + gridLogo.height, '1X', 2780, gridLogo.y + gridLogo.height / 2)}
      <rect x="1035" y="1535" width="565" height="120" fill="${SOFT}"/>
      <rect x="1632" y="1535" width="565" height="120" fill="${SOFT}"/>
      <rect x="2229" y="1535" width="636" height="120" fill="${SOFT}"/>
      <text x="1065" y="1580" fill="${MUTED}" font-size="20">BASE UNIT</text><text x="1065" y="1625" fill="${BLACK}" font-size="28" font-weight="700">1X = Logo height</text>
      <text x="1662" y="1580" fill="${MUTED}" font-size="20">PROPORTION</text><text x="1662" y="1625" fill="${BLACK}" font-size="28" font-weight="700">${ratioText} : 1</text>
      <text x="2259" y="1580" fill="${MUTED}" font-size="20">REPRODUCTION</text><text x="2259" y="1625" fill="${BLACK}" font-size="28" font-weight="700">Scale proportionally</text>`
    )
  });

  // 06 Logo variations
  add({
    id: '06-grid-system-2',
    section: 'logo',
    title: 'LOGO',
    subtitle: 'Logo variations',
    svg: commonPage(project, 'LOGO', 'Logo variations', copy.variations,
      `${leftMeta([['Primary', 'Brand color'], ['Mono', 'Black / White'], ['Reverse', 'High contrast']])}
      ${panel(1035, 460, 885, 500, WHITE, LINE)}
      ${label('01 · PRIMARY', 1075, 520)}
      ${logo(project.logo, 1220, 650, 520, 170, primary)}
      ${panel(1955, 460, 910, 500, primary)}
      ${label('02 · REVERSE', 1995, 520, contrast(primary))}
      ${logo(project.logo, 2150, 650, 520, 170, contrast(primary))}
      ${panel(1035, 995, 885, 500, '#F2F2F2')}
      ${label('03 · BLACK', 1075, 1055)}
      ${logo(project.logo, 1220, 1185, 520, 170, BLACK)}
      ${panel(1955, 995, 910, 500, BLACK)}
      ${label('04 · WHITE', 1995, 1055, WHITE)}
      ${logo(project.logo, 2150, 1185, 520, 170, WHITE)}
      <text x="1035" y="1605" fill="${MUTED}" font-size="22">Choose the version with the clearest contrast for each background.</text>`
    )
  });

  // 07 Clear space
  const clearLogo = fitLogo(project.logo, 1450, 760, 980, 330, 20);
  const clearPx = Math.max(62, clearLogo.height * clear);
  add({
    id: '07-clear-space-1',
    section: 'logo',
    title: 'LOGO',
    subtitle: 'Clear space',
    svg: commonPage(project, 'LOGO', 'Clear space', copy.clear,
      `${leftMeta([['Unit', 'X = Logo height'], ['Minimum', `${clear}X`], ['Applies to', 'All media']])}
      ${panel(1035, 460, 1830, 1010, '#FAFAFA', LINE)}
      <rect x="${clearLogo.x - clearPx}" y="${clearLogo.y - clearPx}" width="${clearLogo.width + clearPx * 2}" height="${clearLogo.height + clearPx * 2}" fill="#EFEFEF" stroke="${GUIDE}" stroke-width="2" stroke-dasharray="12 9"/>
      <rect x="${clearLogo.x}" y="${clearLogo.y}" width="${clearLogo.width}" height="${clearLogo.height}" fill="#FFFFFF"/>
      ${logo(project.logo, clearLogo.x, clearLogo.y, clearLogo.width, clearLogo.height)}
      ${measurementLine(clearLogo.x - clearPx, clearLogo.y - clearPx - 38, clearLogo.x, clearLogo.y - clearPx - 38, `${clear}X`, clearLogo.x - clearPx / 2, clearLogo.y - clearPx - 55)}
      ${measurementLine(clearLogo.x + clearLogo.width, clearLogo.y - clearPx - 38, clearLogo.x + clearLogo.width + clearPx, clearLogo.y - clearPx - 38, `${clear}X`, clearLogo.x + clearLogo.width + clearPx / 2, clearLogo.y - clearPx - 55)}
      <text x="1070" y="1535" fill="${MUTED}" font-size="22">SAFE AREA</text>
      <text x="1070" y="1585" fill="${BLACK}" font-size="30" font-weight="700">No text, image, icon or edge may enter the protected area.</text>`
    )
  });

  // 08 Incorrect usage
  const badCells = [
    ['Do not stretch', 1035, 500],
    ['Do not rotate', 1645, 500],
    ['Do not add effects', 2255, 500],
    ['Do not recolor', 1035, 1040],
    ['Do not outline', 1645, 1040],
    ['Do not reduce contrast', 2255, 1040],
  ] as const;
  const badMarkup = badCells.map(([title, x, y], index) => {
    const bg = index === 5 ? '#EAEAEA' : '#FAFAFA';
    const logoColor = index === 3 ? ERROR : index === 5 ? '#D0D0D0' : BLACK;
    return `${panel(x, y, 575, 460, bg, LINE)}<text x="${x + 24}" y="${y + 44}" fill="${MUTED}" font-size="20" font-weight="600">${esc(title.toUpperCase())}</text>${logo(project.logo, x + 110, y + 145, 355, 120, logoColor)}${cross(x + 20, y + 72, 535, 330)}`;
  }).join('');
  add({
    id: '08-clear-space-2',
    section: 'logo',
    title: 'LOGO',
    subtitle: 'Incorrect usage',
    svg: commonPage(project, 'LOGO', 'Incorrect usage', copy.incorrect,
      `${leftMeta([['Shape', 'No distortion'], ['Color', 'Approved only'], ['Effect', 'None']])}${badMarkup}`
    )
  });

  // 09 Minimum size
  add({
    id: '09-minimum-size',
    section: 'logo',
    title: 'LOGO',
    subtitle: 'Minimum size',
    svg: commonPage(project, 'LOGO', 'Minimum size', copy.minimum,
      `${leftMeta([['Print', `${project.rules.minimumPrintMm} mm`], ['Digital', `${project.rules.minimumDigitalPx} px`], ['Priority', 'Legibility first']])}
      ${panel(1035, 460, 885, 900, '#FAFAFA', LINE)}
      ${label('PRINT', 1080, 520)}
      <text x="1080" y="620" fill="${BLACK}" font-size="88" font-weight="700">${project.rules.minimumPrintMm} mm</text>
      <text x="1080" y="675" fill="${MUTED}" font-size="23">Minimum width for printed material</text>
      ${logo(project.logo, 1195, 900, 565, 180)}
      <line x1="1195" y1="1135" x2="1760" y2="1135" stroke="${BLACK}" stroke-width="2"/>
      <text x="1478" y="1185" fill="${MUTED}" font-size="22" text-anchor="middle">${project.rules.minimumPrintMm} mm</text>

      ${panel(1955, 460, 910, 900, '#FAFAFA', LINE)}
      ${label('DIGITAL', 2000, 520)}
      <text x="2000" y="620" fill="${BLACK}" font-size="88" font-weight="700">${project.rules.minimumDigitalPx} px</text>
      <text x="2000" y="675" fill="${MUTED}" font-size="23">Minimum width for digital interface</text>
      ${logo(project.logo, 2120, 900, 580, 180)}
      <line x1="2120" y1="1135" x2="2700" y2="1135" stroke="${BLACK}" stroke-width="2"/>
      <text x="2410" y="1185" fill="${MUTED}" font-size="22" text-anchor="middle">${project.rules.minimumDigitalPx} px</text>

      <rect x="1035" y="1400" width="1830" height="150" fill="${SOFT}"/>
      <text x="1075" y="1455" fill="${MUTED}" font-size="21">CHECK</text>
      <text x="1075" y="1505" fill="${BLACK}" font-size="28" font-weight="600">If fine details disappear, use a larger size rather than simplifying or redrawing the logo.</text>`
    )
  });

  // 10 Color section
  add({ id: '10-color-section', section: 'color', title: 'COLOR', subtitle: '', svg: sectionIntro('COLOR', '02', ['Brand color', 'Color system', 'Combinations', 'Usage guide']) });

  // 11 Brand color
  add({
    id: '11-monochromatic',
    section: 'color',
    title: 'COLOR',
    subtitle: 'Brand color',
    svg: commonPage(project, 'COLOR', 'Brand color', copy.color,
      `${leftMeta([['Primary', primary], ['Secondary', secondary], ['Accent', accent]])}
      ${colorSpec(primary, 1035, 460, 570, 1090, 'PRIMARY')}
      ${colorSpec(secondary, 1630, 460, 570, 1090, 'SECONDARY')}
      ${colorSpec(accent, 2225, 460, 640, 1090, 'ACCENT')}`
    )
  });

  // 12 Color system
  add({
    id: '12-brand-color',
    section: 'color',
    title: 'COLOR',
    subtitle: 'Color system',
    svg: commonPage(project, 'COLOR', 'Color system', copy.colorSystem,
      `${leftMeta([['Primary', '60%'], ['Secondary', '30%'], ['Accent', '10%']])}
      <text x="1035" y="520" fill="${MUTED}" font-size="22" font-weight="700">RECOMMENDED COLOR RATIO</text>
      <rect x="1035" y="570" width="1098" height="360" fill="${primary}"/>
      <rect x="2133" y="570" width="549" height="360" fill="${secondary}"/>
      <rect x="2682" y="570" width="183" height="360" fill="${accent}"/>
      <text x="1070" y="885" fill="${contrast(primary)}" font-size="28" font-weight="700">60%</text>
      <text x="2168" y="885" fill="${contrast(secondary)}" font-size="28" font-weight="700">30%</text>
      <text x="2710" y="885" fill="${contrast(accent)}" font-size="28" font-weight="700">10%</text>

      <text x="1035" y="1040" fill="${MUTED}" font-size="22" font-weight="700">PRIMARY TINT SCALE</text>
      <rect x="1035" y="1090" width="366" height="340" fill="${primary}" opacity=".15"/>
      <rect x="1401" y="1090" width="366" height="340" fill="${primary}" opacity=".35"/>
      <rect x="1767" y="1090" width="366" height="340" fill="${primary}" opacity=".55"/>
      <rect x="2133" y="1090" width="366" height="340" fill="${primary}" opacity=".75"/>
      <rect x="2499" y="1090" width="366" height="340" fill="${primary}"/>
      <text x="1065" y="1485" fill="${MUTED}" font-size="20">15</text>
      <text x="1431" y="1485" fill="${MUTED}" font-size="20">35</text>
      <text x="1797" y="1485" fill="${MUTED}" font-size="20">55</text>
      <text x="2163" y="1485" fill="${MUTED}" font-size="20">75</text>
      <text x="2529" y="1485" fill="${MUTED}" font-size="20">100</text>`
    )
  });

  // 13 Combinations
  add({
    id: '13-color-combination',
    section: 'color',
    title: 'COLOR',
    subtitle: 'Combinations',
    svg: commonPage(project, 'COLOR', 'Combinations', copy.combination,
      `${leftMeta([['Rule', 'Contrast first'], ['Preferred', 'Primary / White'], ['Avoid', 'Low contrast']])}
      ${colorCell(project, primary, contrast(primary), 1035, 460, 885, 330, 'PRIMARY')}
      ${colorCell(project, WHITE, primary, 1955, 460, 910, 330, 'WHITE')}
      ${colorCell(project, BLACK, WHITE, 1035, 825, 885, 330, 'BLACK')}
      ${colorCell(project, secondary, contrast(secondary), 1955, 825, 910, 330, 'SECONDARY')}
      ${colorCell(project, accent, contrast(accent), 1035, 1190, 885, 330, 'ACCENT')}
      ${colorCell(project, WHITE, BLACK, 1955, 1190, 910, 330, 'MONOCHROME')}`
    )
  });

  // 14 Usage guide
  const usageBackgrounds = [WHITE, primary, secondary, accent, BLACK];
  const usageLogoColors = [primary, WHITE, BLACK];
  let usageMatrix = '';
  usageBackgrounds.forEach((bg, row) => {
    usageLogoColors.forEach((lc, col) => {
      usageMatrix += usageCell(project, bg, lc, 1035 + col * 570, 565 + row * 190, 570, 190);
    });
  });
  add({
    id: '14-color-usage',
    section: 'color',
    title: 'COLOR',
    subtitle: 'Usage guide',
    svg: commonPage(project, 'COLOR', 'Usage guide', copy.usage,
      `${leftMeta([['Best', 'High contrast'], ['Ratio', '60 / 30 / 10'], ['Consistency', 'Use master values']])}
      <text x="1035" y="505" fill="${MUTED}" font-size="22" font-weight="700">BACKGROUND × LOGO COLOR MATRIX</text>
      ${usageMatrix}
      <text x="1035" y="1585" fill="${MUTED}" font-size="21">Red cross = insufficient contrast or non-recommended combination.</text>`
    )
  });

  // 15 Typography section
  add({ id: '15-typography-section', section: 'typography', title: 'TYPOGRAPHY', subtitle: '', svg: sectionIntro('TYPOGRAPHY', '03', ['Title text', 'Body text']) });

  // 16 Title text
  const titleFont = project.typography.title || 'Pretendard';
  add({
    id: '16-title-typeface',
    section: 'typography',
    title: 'TYPOGRAPHY',
    subtitle: 'Title text',
    svg: commonPage(project, 'TYPOGRAPHY', 'Title text', copy.title,
      `${leftMeta([['Typeface', titleFont], ['Weight', 'Bold / SemiBold'], ['Tracking', '-3%']])}
      ${panel(1035, 460, 1830, 740, WHITE, LINE)}
      <g style="font-family:${fontStack(titleFont)}">
        <text x="1090" y="655" fill="${BLACK}" font-size="182" font-weight="700">Aa</text>
        <text x="1420" y="650" fill="${BLACK}" font-size="88" font-weight="700">Brand Headline</text>
        <text x="1420" y="735" fill="${MUTED}" font-size="34" font-weight="500">브랜드의 핵심 메시지를 명확하게 전달합니다.</text>
        <text x="1090" y="930" fill="${BLACK}" font-size="50" font-weight="700">ABCDEFGHIJKLMNOPQRSTUVWXYZ</text>
        <text x="1090" y="1005" fill="${BLACK}" font-size="50" font-weight="700">abcdefghijklmnopqrstuvwxyz · 0123456789</text>
      </g>
      <rect x="1035" y="1240" width="430" height="300" fill="${SOFT}"/>
      <rect x="1490" y="1240" width="430" height="300" fill="${SOFT}"/>
      <rect x="1945" y="1240" width="430" height="300" fill="${SOFT}"/>
      <rect x="2400" y="1240" width="465" height="300" fill="${SOFT}"/>
      <text x="1070" y="1300" fill="${MUTED}" font-size="20">DISPLAY</text><text x="1070" y="1380" fill="${BLACK}" font-size="50" font-weight="700">56 / 64</text><text x="1070" y="1460" fill="${MUTED}" font-size="22">Bold</text>
      <text x="1525" y="1300" fill="${MUTED}" font-size="20">H1</text><text x="1525" y="1380" fill="${BLACK}" font-size="50" font-weight="700">40 / 48</text><text x="1525" y="1460" fill="${MUTED}" font-size="22">Bold</text>
      <text x="1980" y="1300" fill="${MUTED}" font-size="20">H2</text><text x="1980" y="1380" fill="${BLACK}" font-size="50" font-weight="700">28 / 38</text><text x="1980" y="1460" fill="${MUTED}" font-size="22">SemiBold</text>
      <text x="2435" y="1300" fill="${MUTED}" font-size="20">TRACKING</text><text x="2435" y="1380" fill="${BLACK}" font-size="50" font-weight="700">-3%</text><text x="2435" y="1460" fill="${MUTED}" font-size="22">Recommended</text>`
    )
  });

  // 17 Body text
  const bodyFont = project.typography.body || 'Pretendard';
  add({
    id: '17-body-typeface',
    section: 'typography',
    title: 'TYPOGRAPHY',
    subtitle: 'Body text',
    svg: commonPage(project, 'TYPOGRAPHY', 'Body text', copy.body,
      `${leftMeta([['Typeface', bodyFont], ['Body', '16 / 28'], ['Caption', '12 / 18']])}
      ${panel(1035, 460, 1830, 1100, WHITE, LINE)}
      <g style="font-family:${fontStack(bodyFont)}">
        <text x="1090" y="565" fill="${MUTED}" font-size="20" font-weight="700">TYPE SCALE / HIERARCHY</text>
        <text x="1090" y="700" fill="${BLACK}" font-size="72" font-weight="700">Heading 01</text>
        <text x="1090" y="800" fill="${BLACK}" font-size="52" font-weight="600">Heading 02</text>
        <text x="1090" y="905" fill="${BLACK}" font-size="34" font-weight="600">브랜드 메시지를 읽기 쉬운 구조로 정리합니다.</text>
        <text x="1090" y="1000" fill="${BLACK}" font-size="29" font-weight="400">본문 텍스트는 충분한 행간과 안정적인 글자 크기를 사용해 정보를 명확하게 전달합니다.</text>
        <text x="1090" y="1055" fill="${BLACK}" font-size="29" font-weight="400">인쇄물과 디지털 환경 모두에서 동일한 위계 체계를 유지하는 것을 권장합니다.</text>
        <text x="1090" y="1165" fill="${MUTED}" font-size="22">Caption / Supporting information / Metadata</text>

        <text x="2280" y="690" fill="${BLACK}" font-size="34" font-weight="800">ExtraBold</text>
        <text x="2280" y="755" fill="${BLACK}" font-size="34" font-weight="700">Bold</text>
        <text x="2280" y="820" fill="${BLACK}" font-size="34" font-weight="600">SemiBold</text>
        <text x="2280" y="885" fill="${BLACK}" font-size="34" font-weight="500">Medium</text>
        <text x="2280" y="950" fill="${BLACK}" font-size="34" font-weight="400">Regular</text>
        <text x="2280" y="1015" fill="${MUTED}" font-size="34" font-weight="300">Light</text>

        <line x1="1090" y1="1265" x2="2795" y2="1265" stroke="${LINE}" stroke-width="2"/>
        <text x="1090" y="1345" fill="${MUTED}" font-size="20">BODY SAMPLE</text>
        <text x="1090" y="1410" fill="${BLACK}" font-size="28">ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789</text>
        <text x="1090" y="1470" fill="${BLACK}" font-size="28">가나다라마바사아자차카타파하 · 브랜드 아이덴티티 시스템</text>
      </g>`
    )
  });

  // 18 Back cover
  add({
    id: '18-back-cover',
    section: 'end',
    title: 'Back Cover',
    subtitle: '',
    svg: `${openSvg(project, primary)}
      <text x="105" y="170" fill="${coverFg}" opacity=".7" font-size="23">${esc(project.year)} · BRAND IDENTITY GUIDELINES</text>
      ${logo(project.logo, 105, 780, 820, 300, coverFg)}
      <line x1="105" y1="1540" x2="2865" y2="1540" stroke="${coverFg}" opacity=".28" stroke-width="2"/>
      <text x="105" y="1620" fill="${coverFg}" font-size="36" font-weight="700">${esc(englishName)}</text>
      <text x="105" y="1680" fill="${coverFg}" opacity=".72" font-size="24">${esc(project.slogan || 'Visual Identity System')}</text>
      <text x="2440" y="1680" fill="${coverFg}" opacity=".72" font-size="22">END · ${esc(project.year)}</text>
    </svg>`
  });

  return pages;
}
