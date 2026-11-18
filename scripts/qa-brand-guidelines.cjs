/* BRAMER 1차 품질검증. 실브랜드 파일이 아닌 합성 브랜드 SVG 6종의 재현 가능한 엔진 회귀검사. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

const srcRoot = path.resolve(__dirname, '..');
const modules = new Map();
function loadTs(relative) {
  const filename = path.resolve(srcRoot, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const mod = { exports: {} };
  modules.set(filename, mod);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const load = (dependency) => {
    if (!dependency.startsWith('.')) return require(dependency);
    const resolved = path.resolve(path.dirname(filename), dependency);
    return loadTs(path.relative(srcRoot, resolved + '.ts'));
  };
  const run = vm.runInThisContext('(function(require,module,exports) {' + compiled + '\n})', { filename });
  run(load, mod, mod.exports);
  return mod.exports;
}

const { generateV2Pages, CORE_ITEMS, generateBusinessCardSvg, generateStickerSvg, generateLetterheadSvg, generateEnvelopeSvg } =
  loadTs('src/guideline-system/v2Pages.ts');

function fixture(kind) {
  const data = {
    wide: { view:[0,0,900,200], bounds:[30,30,840,140], color:['#222222'], node:'<path d="M30 30 H870 V170 H30 Z" fill="#222222"/>' },
    tall: { view:[0,0,220,850], bounds:[35,20,150,810], color:['#264653'], node:'<rect x="35" y="20" width="150" height="810" fill="#264653"/>' },
    compact: { view:[0,0,500,500], bounds:[75,75,350,350], color:['#B35B42'], node:'<circle cx="250" cy="250" r="175" fill="#B35B42"/>' },
    white: { view:[0,0,800,280], bounds:[20,35,760,210], color:['#FFFFFF'], node:'<path d="M20 35 H780 V245 H20 Z" fill="#FFFFFF"/>' },
    multi: { view:[0,0,600,300], bounds:[20,40,560,220], color:['#C13652','#3053BD'], node:'<rect x="20" y="40" width="240" height="220" fill="#C13652"/><circle cx="455" cy="150" r="105" fill="#3053BD"/>' },
    padded: { view:[0,0,1000,1000], bounds:[320,430,360,140], color:['#111111'], node:'<rect x="320" y="430" width="360" height="140" fill="#111111"/>' },
  }[kind];
  const [x,y,width,height]=data.view, [bx,by,bw,bh]=data.bounds;
  const logo={
    fileName:kind+'.svg', raw:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${data.view.join(' ')}">${data.node}</svg>`,
    inner:data.node, viewBox:{x,y,width,height}, aspectRatio:width/height, colors:data.color,
    analysis:{geometry:{width,height,aspectRatio:width/height,visualAspectRatio:bw/bh,orientation:kind==='tall'?'vertical':'horizontal',visualBounds:{x:bx,y:by,width:bw,height:bh},canvasOccupancy:bw*bh/(width*height)},
      structure:{elementCount:1,pathCount:1,groupCount:0,commandCount:5,smallDetailRatio:0,complexityScore:12,complexity:'low'},
      color:{colors:data.color.map(hex=>({hex,usageRatio:1/data.color.length,occurrences:1})),dominant:data.color[0],colorCount:data.color.length},
      classification:{type:'wordmark',confidence:.8},
      recommendation:{xBasis:'logo-height',clearSpace:.25,minimumPrintMm:10,minimumDigitalPx:40,rationale:['fixture']}
    }
  };
  return {
    name:'건강미 & <Brand>', englishName:'Healthy Me', description:'매일의 건강을 생각하는 브랜드입니다.',
    slogan:'건강한 일상, 좋은 습관',year:'2026',logo,
    colors:{primary:kind==='white'?'#F1F1F1':'#473A88',secondary:'#F6F3E9',accent:'#E4AD78'},
    typography:{title:'Pretendard',body:'Pretendard'},
    rules:{clearSpace:.25,minimumPrintMm:10,minimumDigitalPx:40},
    contact:{personName:'홍길동',position:'대표',phone:'010-1234-5678',email:'test@example.com',website:'example.com',company:'건강미',address:'서울특별시 테스트로 10'}
  };
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bramer-phase1-'));
let checks=0, count=0;
const run=(title,cb)=>{ cb();checks++;console.log('PASS',title); };
try{
  run('17개 항목 정의와 중복 확인',()=>{
    assert.equal(CORE_ITEMS.length,17);
    assert.equal(new Set(CORE_ITEMS.map(item=>item[0])).size,17);
  });
  for(const kind of ['wide','tall','compact','white','multi','padded']){
    const p=fixture(kind),pages=generateV2Pages(p);
    run(kind+' · 26페이지 구성/중복/부적절한 항목',()=>{
      assert.equal(pages.length,26);
      assert.equal(new Set(pages.map(page=>page.id)).size,26);
      assert.ok(pages.every(page=>page.svg.includes('<svg') && page.svg.includes('</svg>')));
      assert.ok(!pages.some(page=>['photography','graphic'].includes(page.section)));
      assert.ok(!pages.some(page=>/logo variations|digital application|label sticker/i.test(page.subtitle)));
      assert.ok(pages.some(page=>page.id==='v2-05-incorrect-usage'));
      assert.ok(pages.some(page=>page.id==='v2-09-color-contrast'));
      assert.ok(pages.some(page=>page.id==='v2-13-brand-message'));
    });
    run(kind+' · 브랜드 텍스트 탈출 및 실제 입력 반영',()=>{
      const brand=pages.find(x=>x.id==='v2-12-brand-overview').svg;
      assert.ok(brand.includes('건강미 &amp; &lt;Brand&gt;'));
      assert.ok(pages.find(x=>x.id==='v2-13-brand-message').svg.includes('건강한 일상'));
      assert.ok(pages.find(x=>x.id==='v2-14-business-card').svg.includes('홍길동'));
      assert.ok(pages.find(x=>x.id==='v2-17-envelope').svg.includes('테스트로 10'));
    });
    const artwork=[
      ...pages.map((page,i)=>['guide-'+i,page.svg]),
      ['card-front',generateBusinessCardSvg(p)],['card-back',generateBusinessCardSvg(p,true)],
      ['sticker-circle',generateStickerSvg(p,'circle')],['sticker-square',generateStickerSvg(p,'square')],
      ['letterhead',generateLetterheadSvg(p)],['envelope-small',generateEnvelopeSvg(p,'small')],
      ['envelope-large',generateEnvelopeSvg(p,'large')],
    ];
    for(const [name,svg] of artwork)fs.writeFileSync(path.join(tmp,kind+'-'+name+'.svg'),svg);
    count+=artwork.length;
  }
  run('패딩이 큰 SVG에서도 로고를 실제 시각 영역으로 맞춤',()=>{
    const p=fixture('padded');
    const page=generateV2Pages(p).find(x=>x.id==='04-signature-logo').svg;
    assert.ok(page.includes('viewBox="311 421 378 158"'), 'Expected padded artwork to use cropped visible viewBox');
  });
  run('불완전한 브랜드 정보는 임의로 지어내지 않음',()=>{
    const p=fixture('compact');p.description='';p.slogan='';delete p.contact;
    const pages=generateV2Pages(p);
    assert.ok(pages.find(x=>x.id==='v2-12-brand-overview').svg.includes('입력 필요'));
    assert.ok(pages.find(x=>x.id==='v2-13-brand-message').svg.includes('입력 필요'));
    assert.equal(pages.length,26);
  });
  run('밝은 브랜드 컬러의 제목 가독성',()=>{
    const p=fixture('white');
    const page=generateV2Pages(p).find(x=>x.id==='v2-12-brand-overview').svg;
    assert.ok(page.includes('fill="#242424"'), 'Light primary should use dark editorial heading');
    assert.ok(!page.includes('font-size="88" fill="#F1F1F1"'), 'Very light primary should not be used as white-background heading');
  });
  run('긴 슬로건·브랜드명·연락처를 텍스트 프레임 안에 맞춤',()=>{
    const p=fixture('wide');
    p.name='건강미 프리미엄 헬스케어 연구개발센터 브랜드 시스템';
    p.englishName='Healthy Me International Research Development Studio';
    p.description='매우 긴 문장에서도 가이드라인의 본문이 오른쪽 여백을 넘어가지 않도록 편집 기준을 적용합니다. '.repeat(8);
    p.slogan='건강한 일상을 위한 지속 가능한 과학적 접근과 좋은 습관을 모두의 삶 속에 자연스럽게 연결합니다.';
    p.contact.personName='대한민국 브랜드 전략 및 브랜드 디자인 총괄 책임자';
    p.contact.email='long-business-email-address-and-department@example-very-long-company-domain.com';
    const pages=generateV2Pages(p);
    const overview=pages.find(x=>x.id==='v2-12-brand-overview').svg;
    const message=pages.find(x=>x.id==='v2-13-brand-message').svg;
    const business=generateBusinessCardSvg(p,true);
    assert.ok(overview.includes('font-size="'));
    assert.ok(message.includes('브랜드 슬로건과 메시지'));
    assert.ok(message.includes('건강한 일상을'));
    assert.ok(!/NaN|Infinity/.test(overview+message+business));
    assert.ok(!business.includes('textLength='));
    assert.ok(business.includes('long-business-email'));
    fs.writeFileSync(path.join(tmp,'long-content-overview.svg'),overview);
    fs.writeFileSync(path.join(tmp,'long-content-message.svg'),message);
    fs.writeFileSync(path.join(tmp,'long-content-card.svg'),business);
    count+=3;
  });
  run('컬러 대비의 계산 결과와 문서 활용 주의사항 표시',()=>{
    const p=fixture('compact');
    const page=generateV2Pages(p).find(x=>x.id==='v2-09-color-contrast').svg;
    assert.ok(page.includes('MONO #'));
    assert.ok(page.includes(':1'));
    assert.ok(page.includes('실제 컬러 원본 로고'));
    assert.ok(page.includes('원본 로고'));
  });
  run('명함 SVG의 정확한 출력 규격과 최소 안전 여백',()=>{
    const p=fixture('wide');
    const front=generateBusinessCardSvg(p),back=generateBusinessCardSvg(p,true);
    for (const svg of [front,back]) {
      assert.ok(svg.includes('width="90mm" height="50mm"'));
      assert.ok(svg.includes('viewBox="0 0 900 500"'));
    }
    assert.ok(back.includes('x="70"'), 'Contact text should begin within a 7mm margin');
    assert.ok(!back.includes('x="7" '), 'The old 0.7mm unsafe margin must be removed');
  });
  // Python stdlib XML parser checks XML well-formedness, namespace closure, ampersands and nested logos.
  execFileSync('python3',['-c',
    'import glob,sys,xml.etree.ElementTree as E; files=glob.glob(sys.argv[1]+"/*.svg"); [E.parse(p) for p in files]; print("PASS SVG XML",len(files))',
    tmp],{stdio:'inherit'});
  console.log(`\nBRAMER phase-1/2 QA: ${checks} logical checks, ${count} well-formed SVG samples across 6 synthetic logo types.`);
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}
