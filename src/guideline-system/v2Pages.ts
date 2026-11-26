import type { BrandProject, GuidelinePage, LogoAsset } from '../types/guideline';
import { generateGuidelinePages, constructionGridArtwork } from './generatePages';

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
  const size=Math.max(10,Math.min(fontSize,Math.floor(maxWidth/Math.max(1,estimated*1.08))));
  return `<text x="${x}" y="${y}" font-family="Pretendard,Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(v)}</text>`;
};
const wrapCopy = (value:string,maxUnits:number,maxLines:number):string[] => {
  const content=String(value||'').trim().replace(/\s+/g,' ');
  if(!content)return [];
  const units=(str:string)=>[...str].reduce((sum,ch)=>sum+(/[가-힣\u3040-\u30ff\u4e00-\u9fff]/u.test(ch)?2:1),0);
  const result:string[]=[];
  let current='';
  const push=()=>{if(current.trim())result.push(current.trim());current='';};
  for(const word of content.split(' ')){
    const candidate=current?current+' '+word:word;
    if(units(candidate)<=maxUnits){current=candidate;continue;}
    if(current)push();
    if(units(word)<=maxUnits){current=word;continue;}
    // Break only when an individual token cannot fit within the text frame.
    let part='';
    for(const char of word){
      if(part&&units(part+char)>maxUnits){current=part;push();part='';}
      part+=char;
    }
    current=part;
  }
  push();
  return result.slice(0,maxLines);
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
const lines = (items:Array<[string,string]>, x:number, y:number, gap=125):string => items.filter(([,value])=>value?.trim()).map(([key,value],i)=>`${fittedText(key,x,y+i*gap,900,24,'#777')}${fittedText(value,x,y+42+i*gap,1250,35,'#171717')}`).join('');
const note = (text:string,y=1700):string=>fittedText(text,110,y,2720,29,'#777');
const missing = (text:string)=>`<text x="110" y="1770" fill="#B45A2A" font-size="28" font-family="Arial,sans-serif">추가 입력 필요: ${esc(text)}</text>`;
const appPage=(id:string,name:string,subtitle:string,project:BrandProject,markup:string):GuidelinePage=>({id,section:'application',title:name,subtitle,svg:guide(project,name,subtitle,markup)});

const contactInfo=(project:BrandProject)=>project.contact||{personName:'',position:'',phone:'',email:'',website:'',company:'',address:''};
const cardArtwork=(project:BrandProject,back=false):string=>{
  const c=contactInfo(project);
  const dark=hex(project.colors.primary),fg=inkOn(dark);
  if(!back)return `<rect width="900" height="500" fill="${dark}"/>${logo(project,130,145,640,210,fg)}`;
  return `<rect width="900" height="500" fill="#FFFFFF"/>
    ${fittedText(c.personName||'이름 입력 필요',75,105,600,55,'#151515',700)}
    ${fittedText(c.position||'',75,148,620,27,'#666666')}
    ${fittedText(c.company||project.englishName||project.name,75,219,620,31,'#1A1A1A',650)}
    ${fittedText(c.phone||'',75,284,640,27,'#333333')}
    ${fittedText(c.email||'',75,322,640,26,'#333333')}
    ${fittedText(c.website||'',75,360,640,26,'#333333')}
    ${fittedText(c.address||'',75,426,745,22,'#666666')}
    ${logo(project,690,55,130,50)}
    <path d="M75 458H825" stroke="#DCDCDC" stroke-width="2"/>`;
};
const baseCard=(project:BrandProject,reverse=false):string=>cardArtwork(project,reverse);
export function generateBusinessCardSvg(project:BrandProject,reverse=false):string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" viewBox="0 0 900 500">${cardArtwork(project,reverse)}</svg>`;
}

export function generateStickerSvg(project:BrandProject,shape:'circle'|'square'):string {
  const primary=hex(project.colors.primary),fg=inkOn(primary);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="50mm" viewBox="0 0 500 500">${shape==='circle'?`<circle cx="250" cy="250" r="246" fill="${primary}"/>`:`<rect x="0" y="0" width="500" height="500" fill="${primary}"/>`}${logo(project,85,165,330,170,fg)}</svg>`;
}

export function generateLetterheadSvg(project:BrandProject):string {
 const c=contactInfo(project),p=hex(project.colors.primary);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 2100 2970">
 <rect width="2100" height="2970" fill="#FFFFFF"/>
 ${logo(project,165,175,550,175)}
 <path d="M165 430H1935" stroke="${p}" stroke-width="5"/>
 ${fittedText(project.name||project.englishName,165,620,1770,57,'#191919',650)}
 <path d="M165 2560H1935" stroke="#D7D7D7" stroke-width="3"/>
 ${fittedText(c.company||project.name,165,2640,850,32,'#242424',650)}
 ${fittedText(c.address||'',165,2695,1750,26,'#555555')}
 ${fittedText([c.phone,c.email,c.website].filter(Boolean).join(' · '),165,2750,1760,25,'#555555')}
 <text x="1935" y="2840" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="#999999">BRAND LETTERHEAD · A4</text>
 </svg>`;
}
export function generateEnvelopeSvg(project:BrandProject,size:'small'|'large'):string {
 const small=size==='small',w=small?2200:3300,h=small?1050:2450;
 const c=contactInfo(project),p=hex(project.colors.primary);
 const flap=small?160:235,origin=flap+(small?110:150),top=small?150:205;
 const markW=small?545:745,markH=small?150:215;
 const textWidth=w-origin-150,base=small?top+220:top+320;
 const postalBox=small?52:72,boxGap=small?10:14;
 const postalX=w-5*(postalBox+boxGap)-120,postalY=h-(small?170:280);
 const boxes=Array.from({length:5},(_,i)=>`<rect x="${postalX+i*(postalBox+boxGap)}" y="${postalY}" width="${postalBox}" height="${postalBox}" rx="1" fill="none" stroke="#8B8B8B" stroke-width="2"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w/10}mm" height="${h/10}mm" viewBox="0 0 ${w} ${h}">
 <rect width="${w}" height="${h}" fill="#FFFFFF"/>
 <path d="M${flap} 0V${h}L30 ${h-45}Q0 ${h-60} 0 ${h-135}V135Q0 55 40 40Z" fill="${p}"/>
 <path d="M${flap} 0V${h}" stroke="#C8C8C8" stroke-width="3"/>
 ${logo(project,origin,top,markW,markH)}
 ${fittedText(c.company||project.englishName||project.name,origin,base,textWidth,small?31:40,'#171717',650)}
 ${fittedText(c.address||'',origin,base+(small?58:76),textWidth,small?28:36,'#333333')}
 ${fittedText(c.phone||'',origin,base+(small?116:152),textWidth,small?27:34,'#333333')}
 ${fittedText(c.email||'',origin,base+(small?158:207),textWidth,small?26:32,'#333333')}
 ${fittedText(c.website||'',origin,base+(small?200:262),textWidth,small?25:30,'#555555')}
 ${boxes}
 </svg>`;
}
const embedApplication=(svg:string,x:number,y:number,width:number,height:number):string=>{
 const inner=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
 const viewBox=(svg.match(/viewBox="([^"]+)"/)||[])[1]||'0 0 900 500';
 return `<svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
};
const dimensionH=(x:number,y:number,w:number,labelText:string):string=>`<path d="M${x} ${y-11}v22M${x+w} ${y-11}v22M${x} ${y}H${x+w}" stroke="#909090" stroke-width="2" fill="none"/><text x="${x+w/2}" y="${y+40}" font-family="Arial,sans-serif" font-size="26" fill="#444" text-anchor="middle">${labelText}</text>`;
const dimensionV=(x:number,y:number,h:number,labelText:string):string=>`<path d="M${x-11} ${y}h22M${x-11} ${y+h}h22M${x} ${y}V${y+h}" stroke="#909090" stroke-width="2" fill="none"/><text x="${x+18}" y="${y+h/2}" font-family="Arial,sans-serif" font-size="24" fill="#444">${labelText}</text>`;


export function generateApplicationPages(project:BrandProject):GuidelinePage[] {
 const c=contactInfo(project),p=hex(project.colors.primary),fg=inkOn(p);
 const front=generateBusinessCardSvg(project),back=generateBusinessCardSvg(project,true);
 const stationery=generateLetterheadSvg(project);
 const smallEnvelope=generateEnvelopeSvg(project,'small'),largeEnvelope=generateEnvelopeSvg(project,'large');
 return [
 appPage('v2-14-business-card','Business Card','90 × 50 mm · front and back',project,
  `${embedApplication(front,185,485,1195,664)}
   ${embedApplication(back,1530,485,1195,664)}
   <rect x="185" y="485" width="1195" height="664" fill="none" stroke="#D0D0D0" stroke-width="2.5"/>
   <rect x="1530" y="485" width="1195" height="664" fill="none" stroke="#D0D0D0" stroke-width="2.5"/>
   ${dimensionH(185,1188,1195,'90 mm')}
   ${dimensionV(1415,485,664,'50 mm')}
   ${dimensionH(1530,1188,1195,'90 mm')}
   ${dimensionV(2760,485,664,'50 mm')}
   ${fittedText('FRONT · PRIMARY LOGO',185,1330,1200,36,'#444444',600)}
   ${fittedText('BACK · CONTACT DETAILS',1530,1330,1150,36,'#444444',600)}
   ${fittedText(c.personName||'이름 입력 필요',185,1440,1150,36,'#171717',650)}
   ${fittedText(c.position||'',185,1500,1150,30,'#555555')}
   ${fittedText(c.phone||'',1530,1440,1150,31,'#171717')}
   ${fittedText(c.email||'',1530,1500,1150,31,'#171717')}
   ${note('인쇄 규격 90 × 50 mm · 안전 여백 7 mm 이상 · 출력 전 도련 및 서체 검수 필요',1760)}`),
 appPage('v2-15-logo-sticker','Logo Sticker','원형 / 사각형',project,
   `<circle cx="830" cy="940" r="400" fill="${p}"/>${logo(project,520,810,620,260,fg)}<rect x="1610" y="540" width="800" height="800" fill="${p}"/>${logo(project,1700,810,620,260,fg)}<text x="630" y="1450" fill="#777" font-size="30">ROUND · 50mm</text><text x="1790" y="1450" fill="#777" font-size="30">SQUARE · 50mm</text>${note('스티커 SVG는 예시 규격입니다. 인쇄 전 도무송선 및 도련을 별도로 확인하세요.')}`),
 appPage('v2-16-letterhead','Letterhead','A4 210 × 297 mm',project,
  `${fittedText('A4 LETTERHEAD',220,430,680,54,'#171717',700)}
   ${fittedText('Portrait stationery',220,495,700,30,'#777777')}
   ${fittedText('Document body',220,665,700,30,'#666666')}
   ${fittedText('Reserved writing area',220,725,700,26,'#888888')}
   ${embedApplication(stationery,1070,320,850,1202)}
   <rect x="1070" y="320" width="850" height="1202" fill="none" stroke="#CACACA" stroke-width="3"/>
   ${dimensionH(1070,1585,850,'210 mm')}
   ${dimensionV(1970,320,1202,'297 mm')}
   ${note('A4 문서 규격 · 헤더/푸터는 안전 여백 내 배치, 본문 작성 영역 확보',1760)}`),
 appPage('v2-17-envelope','Envelope','Small 220 × 105 mm / Large 330 × 245 mm',project,
  `${fittedText('SMALL ENVELOPE',190,385,1110,43,'#333333',600)}
   ${embedApplication(smallEnvelope,185,460,1220,582)}
   <rect x="185" y="460" width="1220" height="582" fill="none" stroke="#D3D3D3" stroke-width="2"/>
   ${dimensionH(185,1100,1220,'220 mm')}
   ${dimensionV(1450,460,582,'105 mm')}
   ${fittedText('LARGE ENVELOPE',1550,385,1160,43,'#333333',600)}
   ${embedApplication(largeEnvelope,1535,465,1185,880)}
   <rect x="1535" y="465" width="1185" height="880" fill="none" stroke="#D3D3D3" stroke-width="2"/>
   ${dimensionH(1535,1400,1185,'330 mm')}
   ${dimensionV(2755,465,880,'245 mm')}
   ${note('제시 규격은 완성품 외형 기준입니다. 재단·접착 플랩 전개도는 인쇄소 기준에 맞춰 별도 검수하세요.',1740)}`)
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
 const ratio=bounds&&bounds.height>0?bounds.width/bounds.height:project.logo?.aspectRatio||1;
 const body=`${fittedText('VISUAL PROPORTION '+ratio.toFixed(2)+' : 1',160,495,820,47,'#242424',700)}
   ${fittedText('1X = visible logo height',160,585,800,33,'#555555')}
   ${fittedText('Measured from actual SVG bounds',160,655,810,27,'#777777')}
   ${constructionGridArtwork(project,1070,375,1750,1230,'proportion')}
   ${note('표시 비율은 SVG 시각 경계의 실측값입니다. 로고는 원본 비율로 재현하고, 세부 광학 정렬은 별도 검토합니다.',1770)}`;
 return reviewPage(project,'Logo Grid Detail','시각 영역 비율',body,'logo','06-grid-system-2');
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
