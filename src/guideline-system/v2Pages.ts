import type { BrandProject, GuidelinePage, LogoAsset } from '../types/guideline';
import { generateGuidelinePages } from './generatePages';

export const CORE_ITEMS = [
  ['Primary Logo','기본 로고와 사용 원칙'],
  ['Logo Grid System','로고 구조 및 비율'],
  ['Clear Space','로고 보호 공간'],
  ['Minimum Size','인쇄·디지털 최소 사용 크기'],
  ['Incorrect Usage','변형·회전·효과 등의 금지 사례'],
  ['Monochromatic','흑백·단색 로고'],
  ['Brand Colors','메인·서브·포인트 컬러'],
  ['Color Combinations','브랜드 컬러 조합'],
  ['Color Contrast','배경과 로고의 가독성 검토'],
  ['Title Typography','제목 서체와 계층'],
  ['Body Typography','본문 서체와 정보 위계'],
  ['Brand Overview','브랜드 소개와 핵심 가치'],
  ['Brand Message','슬로건과 핵심 메시지'],
  ['Business Card','명함 앞면·뒷면'],
  ['Logo Sticker','원형·사각 스티커'],
  ['Letterhead','A4 공식 문서'],
  ['Envelope','대봉투·소봉투'],
] as const;

export type ApplicationKey = 'businessCard' | 'logoSticker' | 'letterhead' | 'envelope';
export const APPLICATION_KEYS: ApplicationKey[] = ['businessCard','logoSticker','letterhead','envelope'];

const esc = (s:string) => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const hex = (s:string, fallback='#111111') => /^#[0-9a-f]{6}$/i.test(s||'') ? s : fallback;
const luminance = (color:string):number => {
  const value=hex(color).slice(1);
  const channels=[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
};
const contrastRatio = (a:string,b:string):number => {
  const la=luminance(a), lb=luminance(b);
  return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
};
/** Keep light marks on dark brand fills, including mid-dark gray/purple surfaces. */
const inkOn = (color:string):string => {
  if (luminance(color) <= 0.25 && contrastRatio(color,'#FFFFFF') >= 3) return '#FFFFFF';
  return contrastRatio(color,'#111111')>=contrastRatio(color,'#FFFFFF')?'#111111':'#FFFFFF';
};
const editorialInk = (primary:string):string => contrastRatio(primary,'#FFFFFF')>=3?hex(primary):'#242424';
/** Fit a single label within its design box without changing the user's value. */
const fittedText = (value:string,x:number,y:number,maxWidth:number,fontSize:number,fill:string,weight=400):string => {
  const v=String(value||'').trim();
  if(!v) return '';
  const estimated=[...v].reduce((sum,ch)=>sum+(/[가-힣\u3040-\u30ff\u4e00-\u9fff]/u.test(ch)?1:/[A-Z0-9]/.test(ch)?.66:/\s/.test(ch)?.33:.53),0);
  const size=Math.max(16,Math.min(fontSize,Math.floor(maxWidth/Math.max(1,estimated))));
  return `<text x="${x}" y="${y}" font-family="Pretendard,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(v)}</text>`;
};
const wrapCopy = (value:string,maxUnits:number,maxLines:number):string[] => {
  const chunks:string[]=[];
  let line='',count=0;
  for(const ch of [...String(value||'').trim()]){
    const unit=/[가-힣\u3040-\u30ff\u4e00-\u9fff]/u.test(ch)?2:1;
    if(count+unit>maxUnits && line){chunks.push(line.trim());line='';count=0;if(ch===' ')continue;}
    line+=ch;count+=unit;
  }
  if(line.trim())chunks.push(line.trim());
  return chunks.slice(0,maxLines);
};
const guide = (project:BrandProject,title:string,subtitle:string,content:string):string => `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 2970 2100"><rect width="2970" height="2100" fill="#fff"/>${fittedText(title,110,140,880,75,editorialInk(project.colors.primary),700)}${fittedText(subtitle,1120,140,1720,31,'#555555',500)}<path d="M110 215H2860" stroke="#D6D6D6" stroke-width="3"/>${content}<path d="M110 1900H2860" stroke="#D6D6D6" stroke-width="3"/>${fittedText(project.englishName || project.name,110,1965,1080,28,'#666666')}<text x="2860" y="1965" text-anchor="end" font-family="Arial,sans-serif" font-size="24" fill="#888">BRAMER · BRAND GUIDELINES</text></svg>`;
function visibleLogoBox(asset: LogoAsset) {
  const canvas = asset.viewBox;
  const measured = asset.analysis?.geometry?.visualBounds;
  if (!measured || !Number.isFinite(measured.width) || !Number.isFinite(measured.height) ||
      measured.width <= 0 || measured.height <= 0) return canvas;
  const epsilon = Math.max(canvas.width, canvas.height) * 0.002;
  if (measured.x < canvas.x - epsilon || measured.y < canvas.y - epsilon ||
      measured.x + measured.width > canvas.x + canvas.width + epsilon ||
      measured.y + measured.height > canvas.y + canvas.height + epsilon) return canvas;
  // Retain a small optical margin; remove only unnecessary source-artboard padding.
  const pad = Math.max(measured.width, measured.height) * 0.025;
  const left = Math.max(canvas.x, measured.x - pad);
  const top = Math.max(canvas.y, measured.y - pad);
  const right = Math.min(canvas.x + canvas.width, measured.x + measured.width + pad);
  const bottom = Math.min(canvas.y + canvas.height, measured.y + measured.height + pad);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

const logo = (project:BrandProject,x:number,y:number,w:number,h:number,mono?:string):string => {
  const asset:LogoAsset|null=project.logo;
  if (!asset) return `<text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="36" fill="#888">SVG 로고 업로드 필요</text>`;
  const v=visibleLogoBox(asset);
  const ratio=v.width/v.height;
  const fitW=Math.min(w,h*ratio), fitH=fitW/ratio;
  const ox=x+(w-fitW)/2,oy=y+(h-fitH)/2;
  // Keep the original artwork on light pages unless every detected logo
  // color is too pale to read there. Do not turn a multicolor logo monochrome
  // merely because one secondary color is light.
  const effective = mono || (asset.colors.length > 0 && asset.colors.every(color => contrastRatio(color,'#FFFFFF') < 3) ? '#111111' : undefined);
  const filterId=`bm-${Math.round(x)}-${Math.round(y)}-${effective==='#FFFFFF'?'w':'b'}`;
  const filter=effective?`<filter id="${filterId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${effective==='#FFFFFF'?1:0} 0 0 0 0 ${effective==='#FFFFFF'?1:0} 0 0 0 0 ${effective==='#FFFFFF'?1:0} 0 0 0 1 0"/></filter>`:'';
  return `<svg x="${ox}" y="${oy}" width="${fitW}" height="${fitH}" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" preserveAspectRatio="xMidYMid meet"><defs>${filter}</defs><g${effective?` filter="url(#${filterId})"`:''}>${asset.inner}</g></svg>`;
};
const lines = (items:Array<[string,string]>, x:number, y:number, gap=125):string => items.filter(([,value])=>value?.trim()).map(([key,value],i)=>`<text x="${x}" y="${y+i*gap}" fill="#777" font-size="24" font-family="Arial,sans-serif">${esc(key)}</text><text x="${x}" y="${y+42+i*gap}" fill="#171717" font-size="35" font-family="Arial,sans-serif">${esc(value.slice(0,75))}</text>`).join('');
const note = (text:string,y=1700):string=>`<text x="110" y="${y}" fill="#777" font-family="Arial,sans-serif" font-size="29">${esc(text)}</text>`;
const missing = (text:string)=>`<text x="110" y="1770" fill="#B45A2A" font-size="28" font-family="Arial,sans-serif">추가 입력 필요: ${esc(text)}</text>`;
const appPage=(id:string,name:string,subtitle:string,project:BrandProject,markup:string):GuidelinePage=>({id,section:'application',title:name,subtitle,svg:guide(project,name,subtitle,markup)});
const baseCard=(project:BrandProject,reverse=false):string=>{
  const c=project.contact;
  const bg=reverse?'#FFFFFF':hex(project.colors.primary);
  const fg=reverse?'#141414':inkOn(bg);
  if(!reverse) return `<rect width="900" height="500" rx="3" fill="${bg}"/>${logo(project,90,130,720,245,fg)}`;
  const row=(label:string,value:string,y:number)=> value?.trim()
    ? `${fittedText(label,70,y-28,130,18,'#777777',500)}${fittedText(value,70,y,770,25,'#242424')}`
    : '';
  return `<rect width="900" height="500" rx="3" fill="#FFFFFF" stroke="#DDDDDD"/>
    ${fittedText(c?.personName||'이름 입력 필요',70,100,760,45,fg,650)}
    ${fittedText(c?.position||'',70,150,760,26,'#777777')}
    <path d="M70 198H830" stroke="#E6E6E6" stroke-width="2"/>
    ${row('PHONE',c?.phone||'',280)}
    ${row('EMAIL',c?.email||'',360)}
    ${row('WEBSITE',c?.website||'',440)}`;
};
export function generateBusinessCardSvg(project:BrandProject,reverse=false):string {
  const c=project.contact;
  const bg=reverse?'#FFFFFF':hex(project.colors.primary), fg=reverse?'#111111':inkOn(bg);
  const front=logo(project,95,110,710,280,fg);
  const info=reverse
    ? `${fittedText(c?.personName||'이름 입력 필요',70,110,760,46,'#191919',650)}
       ${fittedText(c?.position||'',70,160,760,26,'#777777')}
       <path d="M70 203H830" stroke="#DCDCDC" stroke-width="2"/>
       ${fittedText(c?.phone||'',70,290,760,27,'#333333')}
       ${fittedText(c?.email||'',70,355,760,27,'#333333')}
       ${fittedText(c?.website||'',70,420,760,27,'#333333')}`
    : front;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" viewBox="0 0 900 500"><rect width="900" height="500" fill="${bg}"/>${info}</svg>`;
}
export function generateStickerSvg(project:BrandProject,shape:'circle'|'square'):string {
  const primary=hex(project.colors.primary),fg=inkOn(primary);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="50mm" viewBox="0 0 500 500">${shape==='circle'?`<circle cx="250" cy="250" r="246" fill="${primary}"/>`:`<rect x="0" y="0" width="500" height="500" fill="${primary}"/>`}${logo(project,85,165,330,170,fg)}</svg>`;
}
export function generateLetterheadSvg(project:BrandProject):string {
  const c=project.contact, primary=hex(project.colors.primary);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 2100 2970">
    <rect width="2100" height="2970" fill="#FFFFFF"/>
    ${logo(project,170,145,650,210)}
    <path d="M170 445H1930" stroke="${primary}" stroke-width="6"/>
    <text x="170" y="605" font-size="57" font-family="Arial,sans-serif" font-weight="600" fill="#171717">${esc(project.name.slice(0,45))}</text>
    <path d="M170 2540H1930" stroke="#DDDDDD" stroke-width="3"/>
    <text x="170" y="2600" font-size="29" font-family="Arial,sans-serif" fill="#555">${esc((c?.company||project.name).slice(0,75))}</text>
    <text x="170" y="2650" font-size="26" font-family="Arial,sans-serif" fill="#777">${esc((c?.address||'').slice(0,95))}</text>
    <text x="170" y="2700" font-size="25" font-family="Arial,sans-serif" fill="#777">${esc([c?.phone,c?.email,c?.website].filter(Boolean).join('   ·   ').slice(0,115))}</text>
  </svg>`;
}
export function generateEnvelopeSvg(project:BrandProject, size:'small'|'large'):string {
  const w=size==='small'?2200:3300, h=size==='small'?1100:2450;
  const c=project.contact, p=hex(project.colors.primary);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w/10}mm" height="${h/10}mm" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#FFFFFF"/>
    <path d="M120 120H${w-120}" stroke="${p}" stroke-width="12"/>
    ${logo(project,150,200,Math.min(750,w*.4),240)}
    <text x="150" y="${h-245}" font-family="Arial,sans-serif" font-size="37" fill="#222" font-weight="600">${esc((c?.company||project.name).slice(0,50))}</text>
    <text x="150" y="${h-180}" font-family="Arial,sans-serif" font-size="29" fill="#555">${esc((c?.address||'').slice(0,80))}</text>
    <text x="150" y="${h-120}" font-family="Arial,sans-serif" font-size="26" fill="#777">${esc([c?.phone,c?.website].filter(Boolean).join(' · ').slice(0,80))}</text>
  </svg>`;
}
export function generateApplicationPages(project:BrandProject):GuidelinePage[] {
  const c: NonNullable<BrandProject['contact']> = project.contact ?? { personName:'',position:'',phone:'',email:'',website:'',company:'',address:'' };
  const p=hex(project.colors.primary), fg=inkOn(p);
  return [
    appPage('v2-14-business-card','Business Card','명함 앞면 / 뒷면',project,
      `<g transform="translate(170 480)">${baseCard(project)}</g>
        <g transform="translate(1480 480)">${baseCard(project,true)}</g>
        <text x="170" y="1050" fill="#777" font-family="Arial,sans-serif" font-size="27">FRONT · BRAND LOGO</text>
        <text x="1480" y="1050" fill="#777" font-family="Arial,sans-serif" font-size="27">BACK · CONTACT INFORMATION</text>
        <path d="M170 1200H2790" stroke="#E0E0E0" stroke-width="2"/>
        ${fittedText('90 × 50 mm',170,1300,540,40,'#252525',600)}
        ${fittedText(c.personName||'이름 미입력',170,1400,1100,34,'#252525')}
        ${fittedText(c.position||'직책 미입력',170,1470,1100,28,'#666666')}
        ${fittedText(c.phone||'연락처 미입력',1480,1370,1130,30,'#252525')}
        ${fittedText(c.email||'이메일 미입력',1480,1450,1130,30,'#252525')}
        ${note('SVG는 편집 가능한 디자인 원본입니다. 인쇄 전 재단·도련·서체 검수가 필요합니다.',1760)}`),
    appPage('v2-15-logo-sticker','Logo Sticker','원형 / 사각형',project,
      `<circle cx="830" cy="940" r="400" fill="${p}"/>${logo(project,520,810,620,260,fg)}<rect x="1610" y="540" width="800" height="800" fill="${p}"/>${logo(project,1700,810,620,260,fg)}<text x="630" y="1450" fill="#777" font-size="30">ROUND · 50mm</text><text x="1790" y="1450" fill="#777" font-size="30">SQUARE · 50mm</text>${note('스티커 SVG는 예시 규격입니다. 인쇄 전 도무송선 및 도련을 별도로 확인하세요.')}`),
    appPage('v2-16-letterhead','Letterhead','A4 공식 서식',project,
      `<rect x="780" y="315" width="1290" height="1430" fill="#fff" stroke="#D2D2D2" stroke-width="3"/>${logo(project,850,385,350,115)}<line x1="855" y1="560" x2="2000" y2="560" stroke="${p}" stroke-width="5"/><text x="855" y="690" font-size="46" font-family="Arial,sans-serif" fill="#171717">${esc(project.name)}</text><text x="855" y="770" font-size="26" font-family="Arial,sans-serif" fill="#777">Official document template</text><line x1="855" y1="1490" x2="2000" y2="1490" stroke="#ddd" stroke-width="3"/><text x="855" y="1545" font-size="22" font-family="Arial,sans-serif" fill="#555">${esc((c.company||project.name).slice(0,55))}</text><text x="855" y="1590" font-size="20" font-family="Arial,sans-serif" fill="#777">${esc((c.address||'주소 입력 필요').slice(0,75))}</text><text x="855" y="1635" font-size="20" font-family="Arial,sans-serif" fill="#777">${esc([c.phone,c.email].filter(Boolean).join(' · ').slice(0,85))}</text>${note('A4 210 × 297mm · 문서 본문은 실제 업무에 맞게 작성하세요.')}`),
    appPage('v2-17-envelope','Envelope','소봉투 / 대봉투',project,
      `<rect x="210" y="480" width="1060" height="560" fill="#fff" stroke="#ccc" stroke-width="3"/><path d="M210 480L740 790L1270 480" stroke="#DDD" stroke-width="3" fill="none"/>${logo(project,300,800,370,105)}<rect x="1430" y="470" width="1330" height="850" fill="#fff" stroke="#ccc" stroke-width="3"/><rect x="1430" y="470" width="1330" height="115" fill="${p}"/>${logo(project,1510,655,450,150)}<text x="1510" y="1000" fill="#333" font-size="31" font-family="Arial,sans-serif">${esc((c.company||project.name).slice(0,35))}</text><text x="1510" y="1070" fill="#777" font-size="25" font-family="Arial,sans-serif">${esc((c.address||'주소 입력 필요').slice(0,60))}</text><text x="290" y="1130" fill="#777" font-size="27">SMALL ENVELOPE · MOCKUP</text><text x="1510" y="1400" fill="#777" font-size="27">LARGE ENVELOPE · MOCKUP</text>${note('봉투는 배치 예시입니다. 실제 제작에서는 인쇄소 전개도 규격을 확인하세요.')}`)
  ];
}
function reviewPage(project:BrandProject,title:string,description:string,body:string,section:GuidelinePage['section'],id:string):GuidelinePage {
 return {id,title,subtitle:description,section,svg:guide(project,title,description,body)};
}
/**
 * V2-only examples. The legacy 26-page generator contains sections whose
 * original IDs no longer match the 17-item program. Never relabel unrelated
 * artwork: construct the intended page with a matching visual example.
 */
function gridDetailPage(project:BrandProject):GuidelinePage {
  const bounds=project.logo?.analysis?.geometry?.visualBounds;
  const ratio=bounds && bounds.height>0?bounds.width/bounds.height:project.logo?.aspectRatio||1;
  const height=ratio>=1?285:650;
  const width=Math.min(1270,height*ratio);
  const actualHeight=Math.min(height,width/ratio);
  const x=1490+(1270-width)/2,y=790+(650-actualHeight)/2;
  const markup=`<rect x="1120" y="410" width="1690" height="1180" fill="#FAFAFA" stroke="#E4E4E4" stroke-width="2"/>
    <path d="M1965 450V1540M1160 1000H2760" stroke="#91A9C1" stroke-dasharray="13 10" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${width}" height="${actualHeight}" stroke="#7297BD" stroke-width="3" fill="none"/>
    ${logo(project,x,y,width,actualHeight)}
    <path d="M${x} ${y+actualHeight+65}H${x+width}" stroke="#7297BD" stroke-width="3"/>
    ${fittedText('VISUAL PROPORTION  '+ratio.toFixed(2)+' : 1',150,585,830,42,'#242424',600)}
    ${fittedText('Original artwork · original aspect ratio',150,705,790,29,'#666666')}
    ${note('측정선은 SVG 시각 경계에 기반한 참고 표시입니다. 자간·세부 형태는 수동 검토하세요.',1750)}`;
  return reviewPage(project,'Logo Grid Detail','시각 영역 비율',markup,'logo','06-grid-system-2');
}
function clearSpaceDetailPage(project:BrandProject):GuidelinePage {
  const rule=Math.max(0.1,Math.min(2,project.rules.clearSpace||0.25));
  const card=(x:number,y:number,blocked:boolean)=>{
    const w=1120,h=655, logoW=690,logoH=210;
    const lx=x+215,ly=y+175,space=rule*logoH;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FAFAFA" stroke="#E3E3E3" stroke-width="3"/>
      <rect x="${lx-space}" y="${ly-space}" width="${logoW+space*2}" height="${logoH+space*2}" fill="none" stroke="#93B7C8" stroke-dasharray="13 9" stroke-width="3"/>
      ${logo(project,lx,ly,logoW,logoH)}
      ${blocked?`<rect x="${lx+logoW+space-75}" y="${ly+80}" width="105" height="145" fill="#B95151" opacity=".8"/>`:''}
      ${fittedText(blocked?'NOT ALLOWED · 침범':'ALLOWED · 여백 확보',x+45,y+h-65,1030,35,blocked?'#B95151':'#252525',600)}`;
  };
  return reviewPage(project,'Clear Space Detail','보호 공간 사용 예시',
    card(235,500,false)+card(1590,500,true)+
    `${fittedText('X = displayed logo height · clear space = '+rule.toFixed(2)+'X',235,1400,2100,45,'#222222',600)}
      ${note('보호 공간은 사용자 설정값입니다. 실제 승인된 브랜드 기준과 대조하세요.',1700)}`,
    'logo','08-clear-space-2');
}
function monochromePage(project:BrandProject):GuidelinePage {
  const panel=(x:number,bg:string,fg:string,title:string)=>
    `<rect x="${x}" y="490" width="1240" height="850" fill="${bg}" stroke="#DFDFDF" stroke-width="2"/>
      ${logo(project,x+170,760,900,300,fg)}
      ${fittedText(title,x+45,1250,1080,38,fg,600)}`;
  return reviewPage(project,'Monochromatic','흑백 로고 적용',
    panel(180,'#F7F7F7','#111111','BLACK ON LIGHT')+
    panel(1560,'#151515','#FFFFFF','WHITE ON DARK')+
    `${note('흑백 버전은 원본 구조를 유지한 단색 미리보기입니다. 최종 승인 및 획 가독성을 확인하세요.',1690)}`,
    'logo','11-monochromatic');
}
function sectionIntroV2(project:BrandProject,title:string,index:string,items:string[],id:string,section:GuidelinePage['section']):GuidelinePage{
  const bg=hex(project.colors.primary),foreground=inkOn(bg),muted=foreground==='#FFFFFF'?'#D1CFD9':'#5B5B5B';
  const list=items.map((item,i)=>`${fittedText(String(i+1).padStart(2,'0'),2020,470+i*115,80,32,muted)}
    ${fittedText(item,2140,470+i*115,680,44,foreground)}`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 2970 2100">
    <rect width="2970" height="2100" fill="${bg}"/>
    ${fittedText('BRAND IDENTITY SYSTEM · '+index,120,170,1550,30,muted,600)}
    ${fittedText(title.toUpperCase(),120,1680,1830,190,foreground,700)}
    <path d="M2000 300H2820" stroke="${foreground}" stroke-opacity=".3" stroke-width="3"/>
    ${list}
    <path d="M120 1880H2840" stroke="${foreground}" stroke-opacity=".3" stroke-width="2"/>
    ${fittedText(project.englishName||project.name,120,1960,1200,29,foreground)}
  </svg>`;
  return {id,title:title+' System',subtitle:'챕터 구분',section,svg};
}

export function generateV2Pages(project:BrandProject):GuidelinePage[] {
  const old=generateGuidelinePages(project);
  const byId=(id:string)=>old.find(page=>page.id===id);
  const withTitle=(id:string,title:string,subtitle:string,section:GuidelinePage['section']):GuidelinePage[]=>{
    const original=byId(id);
    return original?[{...original,title,subtitle,section}]:[];
  };
  const important=project.slogan?.trim()||'슬로건을 입력해 주세요.';
  const message=reviewPage(project,'Brand Message','브랜드 슬로건과 메시지',
    `<text x="130" y="480" font-size="31" fill="#777" font-family="Pretendard,Arial,sans-serif">BRAND SLOGAN</text>
      ${wrapCopy(important,53,3).map((line,i)=>fittedText(line,130,670+i*116,2610,78,editorialInk(project.colors.primary),650)).join('')}
      <path d="M130 1160H2830" stroke="#DFDFDF" stroke-width="3"/>
      <text x="130" y="1280" font-size="29" fill="#666" font-family="Pretendard,Arial,sans-serif">브랜드가 공식적으로 사용하는 문구를 입력하고 검토하세요.</text>
      ${project.slogan?.trim()?'':missing('슬로건')}`, 'verbal','v2-13-brand-message');
  const incorrect=reviewPage(project,'Incorrect Usage','로고 사용 금지 사례',
    `<rect x="150" y="380" width="1220" height="590" fill="#FAFAFA" stroke="#E6E6E6" stroke-width="2"/>
      <rect x="1580" y="380" width="1220" height="590" fill="#FAFAFA" stroke="#E6E6E6" stroke-width="2"/>
      <rect x="150" y="1020" width="1220" height="590" fill="#FAFAFA" stroke="#E6E6E6" stroke-width="2"/>
      <rect x="1580" y="1020" width="1220" height="590" fill="#E7E7E7" stroke="#D7D7D7" stroke-width="2"/>
      ${logo(project,365,505,800,260)}
      <g transform="rotate(14 2180 650)">${logo(project,1770,505,800,260)}</g>
      <g transform="translate(-400 200) scale(1.55 .72)">${logo(project,365,1150,800,260)}</g>
      ${logo(project,1770,1150,800,260,'#FFFFFF')}
      ${fittedText('DO · KEEP ORIGINAL',195,875,1130,32,'#242424',600)}
      ${fittedText("DON'T · ROTATE",1625,875,1130,32,'#B04343',600)}
      ${fittedText("DON'T · DISTORT",195,1515,1130,32,'#B04343',600)}
      ${fittedText("DON'T · LOW CONTRAST",1625,1515,1130,32,'#B04343',600)}
      ${note('오른쪽·아래 예시는 의도적으로 잘못 적용한 로고입니다. 형태·비례·시인성을 점검하세요.',1770)}`,
    'logo','v2-05-incorrect-usage');
  const contrastPage=reviewPage(project,'Color Contrast','배경 대비 확인',
    [project.colors.primary,project.colors.secondary,project.colors.accent,'#FFFFFF','#111111'].map((bg,i)=>{
      const safe=hex(bg),fg=inkOn(safe),x=140+(i%3)*925,y=440+Math.floor(i/3)*570;
      const ratio=contrastRatio(safe,fg);
      return `<rect x="${x}" y="${y}" width="825" height="470" fill="${safe}" stroke="#DDD" stroke-width="2"/>
        ${logo(project,x+130,y+95,565,245,fg)}
        ${fittedText(safe,x+25,y+390,250,27,fg,650)}
        ${fittedText('MONO ' + fg + ' · ' + ratio.toFixed(1) + ':1',x+280,y+390,520,25,fg)}`;
    }).join('')+`${note('비율은 단색 로고와 배경의 계산값입니다. 실제 컬러 원본 로고의 적합성은 별도 검수하세요.',1765)}`,'color','v2-09-color-contrast');
  const main:GuidelinePage[]=[
    ...withTitle('01-cover','Cover','표지','intro'),
    ...withTitle('02-index','Index','목차 · 17개 제작 항목','intro'),
    ...withTitle('03-brand-asset-notice','Brand Asset Notice','사용 전 확인 사항','intro'),
    sectionIntroV2(project,'Logo','01',['Primary Logo','Logo Grid System','Clear Space','Minimum Size','Incorrect Usage','Monochromatic'],'03-logo-section','logo'),
    ...withTitle('04-signature-logo','Primary Logo','기본 로고','logo'),
    ...withTitle('05-grid-system-1','Logo Grid System','로고 구조 그리드','logo'),
    gridDetailPage(project),
    ...withTitle('07-clear-space-1','Clear Space','로고 보호 공간','logo'),
    clearSpaceDetailPage(project),
    ...withTitle('09-minimum-size','Minimum Size','최소 사용 크기','logo'),
    incorrect,
    monochromePage(project),
    sectionIntroV2(project,'Color','02',['Brand Colors','Color Combinations','Color Contrast'],'10-color-section','color'),
    ...withTitle('11-monochromatic','Brand Colors','브랜드 지정 색상 · HEX/RGB/CMYK','color').map(page=>({...page,id:'v2-07-brand-colors'})),
    ...withTitle('13-color-combination','Color Combinations','컬러 조합','color'),
    contrastPage,
    sectionIntroV2(project,'Typography','03',['Title Typography','Body Typography'],'15-typography-section','typography'),
    ...withTitle('16-title-typeface','Title Typography','제목 서체','typography'),
    ...withTitle('17-body-typeface','Body Typography','본문 서체','typography'),
    reviewPage(project,'Brand Overview','브랜드 소개',
      `<text x="130" y="455" fill="#777" font-size="31" font-family="Pretendard,Arial,sans-serif">BRAND PROFILE</text>
      ${fittedText(project.name||project.englishName,130,610,2600,88,editorialInk(project.colors.primary),700)}
      ${fittedText(project.englishName||'',130,705,2600,33,'#777777')}
      <path d="M130 810H2830" stroke="#E2E2E2" stroke-width="3"/>
      ${wrapCopy(project.description?.trim()||'브랜드 설명을 입력해 주세요.',66,7).map((line,i)=>fittedText(line,130,930+i*94,2600,39,'#242424')).join('')}
      ${project.description?.trim()?'':missing('브랜드 소개')}`, 'intro','v2-12-brand-overview'),
    message,
    ...generateApplicationPages(project),
    ...withTitle('18-back-cover','Back Cover','뒷표지','end')
  ];
  // Replace the older static index with a live 17-item table of contents.
  const index=main.findIndex(page=>page.id==='02-index');
  if(index>=0){
    const body=CORE_ITEMS.map(([label,description],i)=>{
      const col=i<9?0:1,row=i<9?i:i-9,x=150+col*1370,y=340+row*145;
      return `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="35" fill="#888">${String(i+1).padStart(2,'0')}</text><text x="${x+115}" y="${y}" font-family="Arial,sans-serif" font-size="41" fill="#171717" font-weight="600">${esc(label)}</text><text x="${x+115}" y="${y+47}" font-family="Arial,sans-serif" font-size="24" fill="#777">${esc(description)}</text>`;
    }).join('');
    main[index]={...main[index],svg:guide(project,'CONTENTS','17 guideline items',body)};
  }
  return main;
}
