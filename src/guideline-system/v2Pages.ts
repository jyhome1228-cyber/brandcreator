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
const inkOn = (color:string) => {const c=hex(color).slice(1);const r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);return r*.299+g*.587+b*.114>155?'#111111':'#FFFFFF';};
const guide = (project:BrandProject,title:string,subtitle:string,content:string):string => `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 2970 2100"><rect width="2970" height="2100" fill="#fff"/><text x="110" y="138" font-family="Arial,sans-serif" font-size="75" font-weight="700" fill="${hex(project.colors.primary)}">${esc(title)}</text><text x="1120" y="140" font-family="Arial,sans-serif" font-size="31" fill="#555">${esc(subtitle)}</text><path d="M110 215H2860" stroke="#D6D6D6" stroke-width="3"/>${content}<path d="M110 1900H2860" stroke="#D6D6D6" stroke-width="3"/><text x="110" y="1965" font-family="Arial,sans-serif" font-size="28" fill="#666">${esc(project.englishName || project.name)}</text><text x="2860" y="1965" text-anchor="end" font-family="Arial,sans-serif" font-size="24" fill="#888">BRAMER · BRAND GUIDELINES</text></svg>`;
const logo = (project:BrandProject,x:number,y:number,w:number,h:number,mono?:string):string => {
  const asset:LogoAsset|null=project.logo;
  if (!asset) return `<text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="36" fill="#888">SVG 로고 업로드 필요</text>`;
  const v=asset.viewBox;
  const ratio=asset.aspectRatio||1;
  const fitW=Math.min(w,h*ratio), fitH=fitW/ratio;
  const ox=x+(w-fitW)/2,oy=y+(h-fitH)/2;
  const filterId=`bm-${Math.round(x)}-${Math.round(y)}`;
  const filter=mono?`<filter id="${filterId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${mono==='#FFFFFF'?1:0} 0 0 0 0 ${mono==='#FFFFFF'?1:0} 0 0 0 0 ${mono==='#FFFFFF'?1:0} 0 0 0 1 0"/></filter>`:'';
  return `<svg x="${ox}" y="${oy}" width="${fitW}" height="${fitH}" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" preserveAspectRatio="xMidYMid meet"><defs>${filter}</defs><g${mono?` filter="url(#${filterId})"`:''}>${asset.inner}</g></svg>`;
};
const lines = (items:Array<[string,string]>, x:number, y:number, gap=125):string => items.filter(([,value])=>value?.trim()).map(([key,value],i)=>`<text x="${x}" y="${y+i*gap}" fill="#777" font-size="24" font-family="Arial,sans-serif">${esc(key)}</text><text x="${x}" y="${y+42+i*gap}" fill="#171717" font-size="35" font-family="Arial,sans-serif">${esc(value.slice(0,75))}</text>`).join('');
const note = (text:string,y=1700):string=>`<text x="110" y="${y}" fill="#777" font-family="Arial,sans-serif" font-size="29">${esc(text)}</text>`;
const missing = (text:string)=>`<text x="110" y="1770" fill="#B45A2A" font-size="28" font-family="Arial,sans-serif">추가 입력 필요: ${esc(text)}</text>`;
const appPage=(id:string,name:string,subtitle:string,project:BrandProject,markup:string):GuidelinePage=>({id,section:'application',title:name,subtitle,svg:guide(project,name,subtitle,markup)});
const baseCard=(project:BrandProject,reverse=false):string=>{
  const c=project.contact||{};
  const bg=reverse?'#FFFFFF':hex(project.colors.primary);
  const fg=reverse?'#141414':inkOn(bg);
  return `<rect width="900" height="500" rx="3" fill="${bg}" stroke="${reverse?'#ddd':'none'}"/>${reverse?
    `<text x="70" y="100" font-family="Arial,sans-serif" font-size="35" font-weight="700" fill="${fg}">${esc(c.personName||'이름 미입력')}</text><text x="70" y="150" font-family="Arial,sans-serif" font-size="23" fill="#777">${esc(c.position||'직책 미입력')}</text>${lines([['PHONE',c.phone||''],['EMAIL',c.email||''],['WEB',c.website||'']],70,255,70).replace(/font-size="35"/g,'font-size="23"').replace(/font-size="24"/g,'font-size="18"')}`:
    logo(project,80,145,740,195,fg)
  }`;
};
export function generateBusinessCardSvg(project:BrandProject,reverse=false):string {
  const c=project.contact||{},bg=reverse?'#FFFFFF':hex(project.colors.primary),fg=reverse?'#111111':inkOn(bg);
  const label=(v:string,y:number,size=18)=>`<text x="7" y="${y}" font-size="${size}" fill="${fg}" font-family="Arial,sans-serif">${esc(v)}</text>`;
  const front=logo(project,55,95,790,310,fg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" viewBox="0 0 900 500"><rect width="900" height="500" fill="${bg}"/>${reverse?`${label(c.personName||'이름 미입력',120,40)}${label(c.position||'',165,25)}${label(c.phone||'',325)}${label(c.email||'',365)}${label(c.website||'',405)}`:front}</svg>`;
}
export function generateStickerSvg(project:BrandProject,shape:'circle'|'square'):string {
  const primary=hex(project.colors.primary),fg=inkOn(primary);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="50mm" viewBox="0 0 500 500">${shape==='circle'?`<circle cx="250" cy="250" r="246" fill="${primary}"/>`:`<rect x="0" y="0" width="500" height="500" fill="${primary}"/>`}${logo(project,85,165,330,170,fg)}</svg>`;
}
export function generateApplicationPages(project:BrandProject):GuidelinePage[] {
  const c=project.contact||{};
  const p=hex(project.colors.primary), fg=inkOn(p);
  return [
    appPage('v2-14-business-card','Business Card','명함 앞면 / 뒷면',project,
      `<g transform="translate(170 500)">${baseCard(project)}</g><g transform="translate(1470 500)">${baseCard(project,true)}</g><text x="170" y="1075" fill="#777" font-size="27">FRONT · LOGO</text><text x="1470" y="1075" fill="#777" font-size="27">BACK · CONTACT</text>${lines([['NAME',c.personName||'입력 필요'],['POSITION',c.position||'입력 필요'],['PHONE',c.phone||'입력 필요'],['EMAIL',c.email||'입력 필요']],170,1250,95)}${note('90 × 50 mm 예시 · 인쇄 전 재단·도련·폰트 확인이 필요합니다.',1775)}`),
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
export function generateV2Pages(project:BrandProject):GuidelinePage[] {
  const old=generateGuidelinePages(project);
  const byId=(id:string)=>old.find(page=>page.id===id);
  const withTitle=(id:string,title:string,subtitle:string,section:GuidelinePage['section']):GuidelinePage[]=>{
    const original=byId(id);
    return original?[{...original,title,subtitle,section}]:[];
  };
  const important=project.slogan?.trim()||'슬로건을 입력해 주세요.';
  const message=reviewPage(project,'Brand Message','브랜드 슬로건과 메시지',
    `<text x="130" y="500" font-size="35" fill="#777" font-family="Arial,sans-serif">BRAND SLOGAN</text><text x="130" y="675" font-size="72" font-weight="700" fill="${hex(project.colors.primary)}" font-family="Arial,sans-serif">${esc(important.slice(0,65))}</text><text x="130" y="840" font-size="31" fill="#666" font-family="Arial,sans-serif">브랜드가 공식적으로 사용하는 문구를 입력하고 검토하세요.</text>${project.slogan?.trim()?'':missing('슬로건')}`, 'verbal','v2-13-brand-message');
  const incorrect=reviewPage(project,'Incorrect Usage','로고 사용 금지 사례',
    `<rect x="130" y="410" width="1280" height="990" fill="#F8F8F8"/><rect x="1550" y="410" width="1280" height="990" fill="#F8F8F8"/>${logo(project,275,560,990,290)}${logo(project,1800,610,680,350)}<path d="M1750 540L2640 1210M2640 540L1750 1210" stroke="#D44" stroke-width="13" opacity=".6"/><text x="240" y="1150" font-size="38" fill="#252525">DO · 원본 비율 유지</text><text x="1690" y="1150" font-size="38" fill="#B33">DON'T · 임의 회전/변형 금지</text>${note('금지 예시는 편집 지침이며, 실제 로고의 금지 변형 전체를 포괄하지 않습니다.')}`,'logo','v2-05-incorrect-usage');
  const contrastPage=reviewPage(project,'Color Contrast','배경 대비 확인',
    [project.colors.primary,project.colors.secondary,project.colors.accent,'#FFFFFF','#111111'].map((bg,i)=>{
      const safe=hex(bg),fg=inkOn(safe),x=140+(i%3)*925,y=440+Math.floor(i/3)*570;
      return `<rect x="${x}" y="${y}" width="825" height="470" fill="${safe}" stroke="#DDD" stroke-width="2"/>${logo(project,x+130,y+95,565,245,fg)}<text x="${x+30}" y="${y+420}" fill="${fg}" font-family="Arial,sans-serif" font-size="27">${esc(safe)} · 시각적 검토 필요</text>`;
    }).join('')+`${note('명도 기반 색상 선택은 참고용이며 실제 로고 형태의 시인성은 직접 확인해야 합니다.',1765)}`,'color','v2-09-color-contrast');
  const main:GuidelinePage[]=[
    ...withTitle('01-cover','Cover','표지','intro'),
    ...withTitle('02-index','Index','목차 · 17개 제작 항목','intro'),
    ...withTitle('02-brand-overview','Brand Overview','브랜드 소개','intro'),
    message,
    ...withTitle('03-logo-section','Logo System','로고 사용 규칙','logo'),
    ...withTitle('04-signature-logo','Primary Logo','기본 로고','logo'),
    ...withTitle('05-grid-system-1','Logo Grid System','로고 구조 그리드','logo'),
    ...withTitle('07-clear-space-1','Clear Space','로고 보호 공간','logo'),
    ...withTitle('09-minimum-size','Minimum Size','최소 사용 크기','logo'),
    incorrect,
    ...withTitle('11-monochromatic','Monochromatic','단색·흑백 로고','color'),
    ...withTitle('10-color-section','Color System','컬러 규칙','color'),
    ...withTitle('12-brand-color','Brand Colors','브랜드 지정 색상','color'),
    ...withTitle('13-color-combination','Color Combinations','컬러 조합','color'),
    contrastPage,
    ...withTitle('15-typography-section','Typography','서체 규칙','typography'),
    ...withTitle('16-title-typeface','Title Typography','제목 서체','typography'),
    ...withTitle('17-body-typeface','Body Typography','본문 서체','typography'),
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
