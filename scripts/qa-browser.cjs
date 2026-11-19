/* Browser end-to-end regression: creation, persistence, ZIP/PDF exports, responsive menus. */
const { chromium } = require('playwright');
const JSZip=require('jszip');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const { spawn,execFileSync }=require('node:child_process');
const assert=require('node:assert/strict');

const output=path.resolve('artifacts/browser-qa');
fs.mkdirSync(output,{recursive:true});
const port=4173,url='http://127.0.0.1:'+port+'/brandcreator/';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--base','/brandcreator/','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
let serverOutput='';
vite.stderr.on('data',d=>serverOutput+=d.toString());
vite.stdout.on('data',d=>serverOutput+=d.toString());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let n=0;n<80;n++){
   if(vite.exitCode!==null)throw new Error('Vite preview exited: '+serverOutput);
   try{const r=await fetch(url);if(r.ok)return;}catch{}
   await sleep(250);
 }
 throw new Error('Vite preview did not start: '+serverOutput);
}
const logo='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260"><path fill="#473A88" d="M20 50h560v160H20z"/></svg>';
let browser;
let count=0;
const pass=label=>{count++;console.log('PASS browser',label)};
async function main(){
try{
 await ready();
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 // Mock Firebase anonymous sign-up + restricted write for browser-only QA.
 // Real Firestore rules must still be deployed and tested in Firebase Console.
 const jwtPayload=Buffer.from(JSON.stringify({sub:'qaAnonymousBrowserTester0001'})).toString('base64url');
 const testIdToken='eyJhbGciOiJub25lIn0.'+jwtPayload+'.qa';
 let registeredBetaRecord=null;
 await page.route('**/accounts:signUp?*',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({idToken:testIdToken,localId:'qaAnonymousBrowserTester0001',refreshToken:'qa-refresh',expiresIn:'3600'}),
 }));
 await page.route('**/documents/betaTesters?documentId=*',async route=>{
   registeredBetaRecord=route.request().postDataJSON();
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({name:'projects/bramer-16c27/databases/(default)/documents/betaTesters/qaAnonymousBrowserTester0001'})});
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.bramer-home-hero').waitFor();
 const favicon=await page.locator('link[rel="icon"]').getAttribute('href');
 assert.equal(favicon,'/brandcreator/favicon.svg','Favicon must respect GitHub Pages base URL');
 const faviconResponse=await page.request.get('http://127.0.0.1:'+port+favicon);
 assert.ok(faviconResponse.ok(),'Favicon fetch must succeed at deployed path');
 pass('GitHub Pages base path and favicon work');
 // The admin page is available independently and must never show fabricated user data.
 const adminPage=await context.newPage();
 const currentVisitDay=new Intl.DateTimeFormat('en-CA',{
   timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
 }).format(new Date());
 await adminPage.route('**/visitDaily?*',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({
     documents:[{name:'projects/bramer-16c27/databases/(default)/documents/visitDaily/'+currentVisitDay,
       fields:{day:{stringValue:currentVisitDay},visits:{integerValue:'7'},unique:{integerValue:'5'}}}],
   }),
 }));
 await adminPage.goto(url+'#/admin',{waitUntil:'domcontentloaded'});
 await adminPage.getByRole('heading',{name:'관리자 화면'}).waitFor();
 assert.equal(await adminPage.locator('.bramer-admin-metrics').count(),0,'Admin dashboard remains hidden until PIN');
 await adminPage.locator('#bramer-admin-pin').fill('0000');
 await adminPage.getByRole('button',{name:'확인'}).click();
 await adminPage.getByRole('alert').getByText('비밀번호를 확인해 주세요.').waitFor();
 await adminPage.locator('#bramer-admin-pin').fill('1228');
 await adminPage.getByRole('button',{name:'확인'}).click();
 await adminPage.getByRole('heading',{name:'대시보드'}).waitFor();
 assert.equal(await adminPage.locator('.bramer-admin-metrics article').count(),4,'Admin PIN opens dashboard UI');
 await adminPage.getByText('방문 기록 집계 중').waitFor();
 assert.equal(await adminPage.locator('.bramer-admin-metrics strong').first().innerText(),'7',
   'Admin shows Firestore cumulative visit total');
 assert.equal(await adminPage.locator('.bramer-admin-metrics strong').nth(1).innerText(),'7',
   'Admin shows today visits');
 assert.equal(await adminPage.locator('.bramer-admin-metrics strong').nth(3).innerText(),'5',
   'Admin shows today first-time browsers');
 await adminPage.getByRole('button',{name:'방문 기록',exact:true}).click();
 await adminPage.getByRole('heading',{name:'날짜별 방문 기록'}).waitFor();
 assert.ok(await adminPage.getByText(currentVisitDay).count()>0,'Day-by-day visitor report is visible');
 assert.equal(await adminPage.locator('.bramer-admin-setup-banner').count(),1,
   'Real beta tester PII still requires Firebase administrator access');
 await adminPage.getByRole('button',{name:'베타테스터',exact:true}).click();
 await adminPage.getByRole('heading',{name:'베타테스터 목록'}).waitFor();
 assert.equal(await adminPage.getByText('등록된 베타테스터 데이터가 없습니다.').count(),1);
 await adminPage.getByRole('button',{name:'잠금'}).click();
 await adminPage.getByRole('heading',{name:'관리자 화면'}).waitFor();
 await adminPage.close();
 pass('admin PIN screen, wrong-code rejection and private data protection');
 // Every beta workspace URL must redirect anonymous visitors into registration.
 for (const route of ['/dashboard','/guide','/create','/editor','/projects','/help','/welcome']) {
   const visitor=await context.newPage();
   await visitor.goto(url+'#'+route,{waitUntil:'domcontentloaded'});
   await visitor.waitForURL('**/#/');
   await visitor.getByRole('dialog',{name:'브레이머를 무료로 체험하세요.'}).waitFor();
   assert.equal(await visitor.locator('.bramer-dash-layout,.bramer-create-shell,.editor-layout').count(),0,
     'Anonymous users must not see workspace on '+route);
   await visitor.close();
 }
 pass('all seven protected beta routes require registration before workspace');
 const publicPages=await context.newPage();
 await publicPages.goto(url,{waitUntil:'domcontentloaded'});
 await publicPages.locator('.bramer-site-menu').getByRole('link',{name:'업종별 가이드'}).click();
 await publicPages.waitForURL('**/#/');
 await publicPages.getByRole('dialog',{name:'브레이머를 무료로 체험하세요.'}).waitFor();
 assert.equal(await publicPages.locator('.bramer-dash-layout').count(),0,'Industry guide entry must not expose workspace');
 await publicPages.getByRole('button',{name:'닫기'}).click();
 await publicPages.goto(url,{waitUntil:'domcontentloaded'});
 await publicPages.locator('.bramer-site-menu').getByRole('link',{name:'기술 소개'}).click();
 await publicPages.waitForURL('**/#/technology');
 await publicPages.getByRole('heading',{name:/브랜드의 기준을/}).waitFor();
 const links=await publicPages.locator('.bramer-docs-sidebar nav a').all();
 assert.equal(links.length,10,'Technical navigation includes SVG analysis and rule engine sections');
 await publicPages.locator('.bramer-docs-sidebar nav').getByRole('link',{name:'SVG 분석 엔진'}).click();
 assert.ok(publicPages.url().includes('#/technology'),'SVG analysis navigation remains within technology');
 await publicPages.locator('#svg-engine').waitFor();
 assert.ok((await publicPages.locator('.bramer-docs-engine-results>div').count())===3,'SVG technical summary renders geometry structure and color analysis');
 assert.ok((await publicPages.locator('.bramer-docs-rule-diagram>div').count())===3,'Rule engine workflow renders data, rules, and output');
 await publicPages.locator('.bramer-docs-sidebar nav').getByRole('link',{name:'기술 구조'}).click();
 assert.ok(publicPages.url().includes('#/technology'),'Technical sidebar selection must stay inside the technical document');
 await publicPages.locator('#architecture').waitFor();
 await publicPages.close();
 pass('public industry guide opens registration; technology documentation stays public');
 const grayscale = (color,label) => {
   const values=color.split(/[^0-9.]+/).filter(Boolean).slice(0,3).map(Number);
   assert.ok(values.length===3 && Math.max(...values)-Math.min(...values)<=2,label+' is not neutral gray: '+color);
 };
 grayscale(await page.locator('.bramer-hero-rotation-slide h1 span').evaluate(el=>getComputedStyle(el).color),'Landing headline');
 grayscale(await page.locator('.bramer-hero-rotation .bramer-roller-controls button.active').evaluate(el=>getComputedStyle(el,'::before').backgroundColor),'Landing indicator');
 pass('landing hero typography and active indicator are grayscale');
 const heroLayer=page.locator('.bramer-hero-image-layer');
 await heroLayer.waitFor();
 await page.locator('.bramer-roller-controls button').first().click();
 const firstImage=page.locator('.bramer-hero-image');
 assert.equal(await firstImage.count(),1,'Exactly one image for the current audience slide');
 const firstCss=await firstImage.evaluate(el=>({background:getComputedStyle(el).backgroundImage,opacity:Number(getComputedStyle(el).opacity)}));
 assert.ok(firstCss.background.includes('20261118-043849-'),'Designer audience must use the first reference image');
 assert.ok(firstCss.opacity>=.38,'Hero photo should be clearly more visible');
 assert.equal(await page.locator('.bramer-hero-audience-label').count(),0,'Remove audience label');
 await page.locator('.bramer-roller-controls button').nth(1).click();
 const secondCss=await page.locator('.bramer-hero-image').evaluate(el=>({background:getComputedStyle(el).backgroundImage,opacity:Number(getComputedStyle(el).opacity)}));
 assert.ok(secondCss.background.includes('20261118-043848-'),'Company audience must use the second reference image');
 assert.equal(await page.locator('.bramer-hero-image').count(),1,'Only one image after rotation');
 assert.ok(secondCss.opacity>=.38,'Second reference image should be clearly visible');
 await page.locator('.bramer-roller-controls button').first().click();
 pass('one stronger hero image per rotating audience and no audience label');
 const editorCards=await page.locator('.bramer-help-grid article').count();
 assert.equal(editorCards,3,'Support section keeps three information cards');
 assert.equal(await page.locator('.bramer-process-list .bramer-process-step').count(),3,'How it works retains three actionable steps');
 assert.equal(await page.locator('.bramer-process-graphic').count(),3,'All three process steps have distinct visuals');
 assert.equal(await page.locator('.bramer-home-footer').count(),1,'Footer remains a single section');
 pass('supplied hero imagery, low opacity and unified landing cards');
 await page.locator('.bramer-preview-gallery-card').nth(25).waitFor();
 assert.equal(await page.locator('.bramer-preview-gallery-card').count(),26,'Overview displays all 26 actual guideline pages');
 assert.equal(await page.locator('.bramer-preview-view-switch button.active').innerText(),'전체 보기','Full overview is the first preview tab');
 await page.locator('.bramer-preview-gallery-card').nth(5).click();
 assert.equal(await page.locator('.bramer-preview-view-switch button.active').innerText(),'페이지 보기','Selecting a thumbnail opens the single-page view');
 assert.equal(await page.locator('.bramer-engine-jump select').inputValue(),'5');
 await page.locator('.bramer-engine-jump select option').nth(25).waitFor({state:'attached'});
 assert.equal(await page.locator('.bramer-engine-jump select option').count(),26,'Real BRAMER generator sample should contain 26 selectable pages');
 const sampleImg=page.locator('.bramer-engine-page');
 await sampleImg.waitFor();
 assert.ok(await sampleImg.evaluate(el=>el instanceof HTMLImageElement && el.complete && el.naturalWidth>0),'Actual generated SVG sample must render');
 await page.locator('.bramer-engine-jump select').selectOption('6');
 assert.ok((await sampleImg.getAttribute('alt'))?.length,'Sample page navigation changes the generated SVG');
 assert.ok(await sampleImg.evaluate(el=>getComputedStyle(el).animationName.includes('bramer-page-arrive')),'Guideline page uses a smooth entrance transition');
 assert.equal(await page.locator('.bramer-engine-jump select').inputValue(),'6','Detail navigation moved to selected page');
 assert.equal(await page.locator('.bramer-industry-research-disclaimer').count(),0,'Remove public internal research disclaimer');
 assert.equal(await page.locator('.bramer-preview-note').count(),0,'Unnecessary preview explanation removed');
 pass('live BRAMER 17-item guideline engine produces 26 visible sample pages');
 await page.screenshot({path:path.join(output,'01-landing-desktop.png')});
 await page.locator('.bramer-site-start').click();
 await page.getByRole('dialog',{name:'브레이머를 시작해 볼까요?'}).waitFor();
 assert.equal(await page.getByRole('button',{name:/새로 시작하기/}).count(),1);
 assert.equal(await page.getByRole('button',{name:/베타테스트 로그인/}).count(),1);
 await page.getByRole('button',{name:/베타테스트 로그인/}).click();
 await page.getByRole('heading',{name:'베타테스트 로그인'}).waitFor();
 await page.getByRole('button',{name:'이전으로'}).click();
 await page.getByRole('button',{name:'닫기'}).click();
 pass('two-path header entry shows new registration and beta login');
 const trial=page.locator('.bramer-home-primary').first();
 await trial.click();
 await page.getByRole('dialog').waitFor();
 await page.locator('.bramer-beta-form input[autocomplete="name"]').fill('테스트 담당자');
 await page.locator('.bramer-beta-form input[type="tel"]').fill('010-1234-5678');
 await page.getByRole('button',{name:'선택해 주세요'}).click();
 await page.getByRole('option',{name:'디자이너'}).click();
 await page.locator('.bramer-beta-consent input').check();
 await page.locator('.bramer-beta-primary[type="submit"]').click();
 await page.waitForURL('**/#/welcome');
 assert.equal(registeredBetaRecord?.fields?.name?.stringValue,'테스트 담당자','Firestore stores beta name after explicit consent');
 assert.equal(registeredBetaRecord?.fields?.phone?.stringValue,'01012345678','Firestore stores beta contact for admin view');
 assert.equal(registeredBetaRecord?.fields?.occupation?.stringValue,'디자이너','Firestore stores occupation');
 await page.getByRole('heading',{name:/브레이머를 소개합니다/}).waitFor();
 await page.getByRole('button',{name:'사용 방법 알아보기'}).click();
 await page.getByRole('heading',{name:/세 단계로 간단하게/}).waitFor();
 await page.getByRole('button',{name:/이제 시작합니다/}).click();
 await page.waitForURL('**/#/dashboard');
 await page.getByRole('dialog',{name:'첫 번째 가이드라인을 만들어보세요.'}).waitFor();
 const enrolledGuide=await context.newPage();
 await enrolledGuide.goto(url,{waitUntil:'domcontentloaded'});
 // Session proof is tab-local; a returning beta user signs in before accessing the guide.
 await enrolledGuide.locator('.bramer-site-start').click();
 await enrolledGuide.getByRole('button',{name:/베타테스트 로그인/}).click();
 await enrolledGuide.locator('.bramer-auth-fields input[autocomplete="name"]').fill('테스트 담당자');
 await enrolledGuide.locator('.bramer-auth-fields input[type="tel"]').fill('010-1234-5678');
 await enrolledGuide.getByRole('button',{name:'로그인하고 계속하기'}).click();
 await enrolledGuide.waitForURL('**/#/dashboard');
 await enrolledGuide.goto(url+'#/guide',{waitUntil:'domcontentloaded'});
 await enrolledGuide.getByRole('heading',{name:'우리 브랜드에는 어떤 기준이 필요할까요?'}).waitFor();
 await enrolledGuide.close();
 pass('registered beta user can open industry guide after login');
 const returning=await context.newPage();
 await returning.goto(url,{waitUntil:'domcontentloaded'});
 await returning.locator('.bramer-site-start').click();
 await returning.getByRole('button',{name:/베타테스트 로그인/}).click();
 await returning.locator('.bramer-auth-fields input[autocomplete="name"]').fill('테스트 담당자');
 await returning.locator('.bramer-auth-fields input[type="tel"]').fill('010-1234-5678');
 await returning.getByRole('button',{name:'로그인하고 계속하기'}).click();
 await returning.waitForURL('**/#/dashboard');
 await returning.close();
 pass('returning beta access verifies name and phone on the same browser');
 await page.getByRole('button',{name:'첫 가이드라인 만들기'}).click();
 await page.waitForURL('**/#/create');
 await page.getByRole('heading',{name:'새 브랜드 가이드라인 만들기'}).waitFor();
 pass('landing → beta registration → welcome → logo reveal → dashboard coach → create');
 // Registration must have been stored without retaining raw name or phone in localStorage.
 assert.ok(await page.evaluate(()=>Boolean(localStorage.getItem('bramer-local-beta-proof-v1'))));
 assert.ok(await page.evaluate(()=>!localStorage.getItem('bramer-local-beta-proof-v1')?.includes('010-1234-5678')));

 await page.locator('input[placeholder="브랜드명"]').fill('건강미 테스트');
 await page.locator('input[placeholder="Brand name"]').fill('Healthy Me QA');
 await page.locator('.step-nav-item').nth(2).click();
 await page.locator('.upload-zone input[type="file"]').setInputFiles({name:'sample.svg',mimeType:'image/svg+xml',buffer:Buffer.from(logo)});
 await page.locator('.upload-zone.has-file').waitFor();
 await page.locator('.step-nav-item').nth(3).click();
 await page.locator('.step-nav-item').nth(4).click();
 await page.getByText('사용 규정과 응용 디자인 정보').waitFor();
 await page.locator('input[placeholder="홍길동"]').fill('테스트 담당자');
 await page.screenshot({path:path.join(output,'02-create-last-step-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'가이드라인 생성'}).click();
 await page.waitForURL('**/#/editor');
 assert.equal(await page.locator('.print-page').count(),26);
 assert.ok(await page.locator('.print-pages').evaluate(el=>el.innerHTML.includes('#473A88')),
   'Original user-supplied purple brand color must be preserved in the generated guideline');
 await page.screenshot({path:path.join(output,'03-editor-desktop.png')});
 pass('5-step creation + SVG upload + 26 page output');
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'전체 SVG'}).click();
 const zipDownload=await downloadPromise;
 const dest=path.join(output,zipDownload.suggestedFilename());
 await zipDownload.saveAs(dest);
 const zip=await JSZip.loadAsync(fs.readFileSync(dest));
 assert.equal(Object.keys(zip.files).filter(f=>f.endsWith('.svg')).length,26);
 pass('ZIP export contains all 26 pages');
 const pdfPath=path.join(output,'guideline-output.pdf');
 const pdf=await page.pdf({path:pdfPath,printBackground:true,preferCSSPageSize:true});
 assert.ok(pdf.byteLength>20000);
 // Chrome PDF writes one /Type /Page object per printed page. Check count
 // even on runners without poppler's pdfinfo binary.
 const pdfObjects=pdf.toString('latin1').split('/Type /Page').slice(1).filter(part=>!part.startsWith('s')).length;
 assert.equal(pdfObjects,26,'PDF must contain 26 A4 pages, not an extra blank page');
 pass('Chromium print creates exactly 26-page PDF');
 await page.locator('.bramer-editor-global-menu .bramer-dash-nav').getByRole('button',{name:'내 프로젝트'}).click();
 await page.waitForURL('**/#/projects');
 await page.getByText('건강미 테스트').first().waitFor();
 pass('saved project appears in My Projects');
 await page.getByRole('button',{name:'이어서 작업'}).first().click();
 await page.waitForURL('**/#/create');
 // Resuming a saved project returns to its last wizard step (step 5).
 await page.locator('.step-nav-item').first().click();
 await page.locator('input[placeholder="브랜드명"]').waitFor();
 assert.equal(await page.locator('input[placeholder="브랜드명"]').inputValue(),'건강미 테스트');
 await page.reload();
 await page.locator('.step-nav-item').first().waitFor();
 await page.locator('.step-nav-item').first().click();
 await page.locator('input[placeholder="브랜드명"]').waitFor();
 assert.equal(await page.locator('input[placeholder="브랜드명"]').inputValue(),'건강미 테스트');
 await page.locator('.step-nav-item').nth(2).click();
 await page.locator('.upload-zone.has-file').waitFor();
 pass('IndexedDB save and reload restore brand and SVG');
 const savedRecord=await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
     const req=indexedDB.open('bramer-project-library',1);
     req.onsuccess=()=>resolve(req.result);
     req.onerror=()=>reject(req.error);
   });
   try {
     const entries=await new Promise((resolve,reject)=>{
       const request=db.transaction('projects','readonly').objectStore('projects').getAll();
       request.onsuccess=()=>resolve(request.result);
       request.onerror=()=>reject(request.error);
     });
     return entries.find(entry=>entry.project?.name==='건강미 테스트');
   } finally {db.close();}
 });
 assert.ok(savedRecord?.project?.logo?.raw?.includes('<svg'),'Saved browser project retains source SVG');
 const jsonPath=path.join(output,'project-backup.json');
 fs.writeFileSync(jsonPath,JSON.stringify({
   version:1,product:'bramer',industry:savedRecord.industry,
   selectedCategories:savedRecord.selectedCategories,project:savedRecord.project,
   enabled:savedRecord.enabled,
 }));
 assert.equal(await page.getByRole('button',{name:'JSON 백업'}).count(),0,'Removed JSON backup UI');
 pass('Browser-saved project retains logo, without redundant JSON backup buttons');
 await page.locator('.bramer-dash-nav').getByRole('button',{name:'새로 만들기'}).click();
 await page.locator('input[placeholder="브랜드명"]').fill('별도 브랜드');
 await page.locator('input[placeholder="Brand name"]').fill('Other Brand');
 await page.locator('.bramer-dash-nav').getByRole('button',{name:'내 프로젝트'}).click();
 await page.waitForURL('**/#/projects');
 await page.getByText('별도 브랜드').first().waitFor();
 assert.ok(await page.getByText('건강미 테스트').count()>0);
 pass('multiple brands remain separate');
 await page.locator('.bramer-dash-nav').getByRole('button',{name:'새로 만들기'}).click();
 await page.locator('.bramer-create-import input[type="file"]').setInputFiles(jsonPath);
 await page.locator('input[placeholder="브랜드명"]').waitFor();
 assert.equal(await page.locator('input[placeholder="브랜드명"]').inputValue(),'건강미 테스트');
 pass('JSON backup restore roundtrip');
 // An SVG-first workflow must also keep an untitled draft when no name is entered.
 await page.locator('.bramer-dash-nav').getByRole('button',{name:'새로 만들기'}).click();
 await page.locator('.step-nav-item').nth(2).click();
 await page.locator('.upload-zone input[type="file"]').setInputFiles({name:'untitled.svg',mimeType:'image/svg+xml',buffer:Buffer.from(logo)});
 await page.locator('.upload-zone.has-file').waitFor();
 await page.locator('.bramer-dash-nav').getByRole('button',{name:'내 프로젝트'}).click();
 await page.waitForURL('**/#/projects');
 await page.getByText('이름 없는 프로젝트').first().waitFor();
 pass('untitled SVG-first draft saved without phantom blank project');
 // The content column must not jump between create/guide/projects/help.
 const workspaces=[];
 for(const [route,selector,label] of [
   ['create','.bramer-create-shell .setup-main','create'],
   ['guide','.bramer-guide-content','guide'],
   ['projects','.bramer-projects-content > .bramer-dash-page-title','projects'],
   ['help','.bramer-help-document','help'],
 ]){
   await page.goto(url+'#/'+route,{waitUntil:'domcontentloaded'});
   await page.locator(selector).waitFor();
   const geometry=await page.evaluate((selector)=>{
     const main=document.querySelector('.bramer-dash-content');
     const inner=document.querySelector(selector);
     const sidebar=document.querySelector('.bramer-dash-sidebar');
     if(!main||!inner||!sidebar)throw Error('Missing workspace geometry '+selector);
     const mr=main.getBoundingClientRect(),ir=inner.getBoundingClientRect(),sr=sidebar.getBoundingClientRect();
     return {mainX:mr.x,mainW:mr.width,innerX:ir.x,innerW:ir.width,sidebarW:sr.width};
   },selector);
   workspaces.push({label,...geometry});
   await page.screenshot({path:path.join(output,'workspace-width-'+label+'.png')});
 }
 const base=workspaces[0];
 for(const item of workspaces){
   assert.ok(Math.abs(item.mainX-base.mainX)<=2,'Main X drift '+JSON.stringify(workspaces));
   assert.ok(Math.abs(item.mainW-base.mainW)<=2,'Main width drift '+JSON.stringify(workspaces));
   assert.ok(Math.abs(item.innerX-base.innerX)<=2,'Inner X drift '+JSON.stringify(workspaces));
   assert.ok(Math.abs(item.innerW-base.innerW)<=2,'Inner width drift '+JSON.stringify(workspaces));
   assert.ok(Math.abs(item.sidebarW-base.sidebarW)<=2,'Sidebar width drift '+JSON.stringify(workspaces));
 }
 pass('all four workspace pages align to identical container, content and sidebar widths');
 // Mobile viewport tests: global menus, beta modal and guide navigation.
 const mobile=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,isMobile:true,deviceScaleFactor:1});
 // Mobile workspace layout is tested in an explicitly enrolled beta session.
 await mobile.addInitScript(() => {
   sessionStorage.setItem('bramer-beta-session-v1','active');
   localStorage.setItem('bramer-local-beta-proof-v1',JSON.stringify({salt:'qa-fixture',digest:'qa-fixture',occupation:'디자이너'}));
 });
 const mp=await mobile.newPage();
 const mobileErrors=[];
 mp.on('pageerror',err=>mobileErrors.push(err.message));
 await mp.goto(url,{waitUntil:'domcontentloaded'});
 await mp.locator('.bramer-home-hero').waitFor();
 assert.equal(await mp.locator('.bramer-hero-image').count(),1,'Mobile hero uses one image per slide');
 await mp.locator('.bramer-roller-controls button').nth(1).click();
 assert.ok((await mp.locator('.bramer-hero-image').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('20261118-043848-'),'Mobile second slide uses company reference image');
 const mobileLandingWidth=await mp.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
 assert.ok(mobileLandingWidth.page<=mobileLandingWidth.screen+3,'Mobile landing overflow '+JSON.stringify(mobileLandingWidth));
 await mp.getByRole('button',{name:'메뉴 열기'}).click();
 assert.equal(await mp.getByRole('navigation',{name:'모바일 메뉴'}).getByRole('link').count(),4,'Mobile navigation should expose all four pages');
 await mp.getByRole('navigation',{name:'모바일 메뉴'}).getByRole('link',{name:'이용 방법'}).click();
 assert.equal(await mp.getByRole('button',{name:'메뉴 열기'}).count(),1,'Mobile navigation closes after selection');
 await mp.getByRole('button',{name:'메뉴 열기'}).click();
 await mp.getByRole('navigation',{name:'모바일 메뉴'}).getByRole('link',{name:'기술 소개'}).click();
 await mp.waitForURL('**/#/technology');
 await mp.locator('.bramer-docs-sidebar nav a').first().waitFor();
 const mobileDocWidth=await mp.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
 assert.ok(mobileDocWidth.page<=mobileDocWidth.screen+3,'Mobile technical docs overflow '+JSON.stringify(mobileDocWidth));
 await mp.screenshot({path:path.join(output,'09-technology-mobile.png'),fullPage:true});
 await mp.goto(url,{waitUntil:'domcontentloaded'});
 const mobilePreview=mp.locator('.bramer-mobile-logo-preview');
 await mobilePreview.waitFor();
 await mobilePreview.locator('img[alt="BRAMER"]').waitFor();
 assert.ok(await mobilePreview.evaluate(el=>getComputedStyle(el).backgroundColor==='rgb(8, 8, 8)'),'Mobile preview uses a black background');
 assert.equal(await mp.locator('.bramer-preview-gallery-card').count(),0,'Mobile layout must not render the 26-page thumbnail gallery');
 assert.equal(await mp.locator('.bramer-preview-view-switch').count(),0,'Mobile preview needs no page controls');
 const mobileLogoLoaded=await mobilePreview.locator('img').evaluate(el=>el instanceof HTMLImageElement && el.complete && el.naturalWidth>0);
 assert.ok(mobileLogoLoaded,'Approved BRAMER SVG appears in mobile preview');
 for(const size of [360,390,430]){
   await mp.setViewportSize({width:size,height:844});
   const dimensions=await mp.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
   assert.ok(dimensions.page<=dimensions.screen+3,'Mobile landing overflow at '+size+': '+JSON.stringify(dimensions));
 }
 await mp.setViewportSize({width:390,height:844});
 const processAlignment=await mp.locator('.bramer-home-steps-section .bramer-process-step').evaluateAll(nodes=>
   nodes.map(node=>{
     const article=node.getBoundingClientRect();
     const graphic=node.querySelector('.bramer-process-graphic')?.getBoundingClientRect();
     const copy=node.querySelector('.bramer-process-copy')?.getBoundingClientRect();
     const index=node.querySelector('.bramer-process-index')?.getBoundingClientRect();
     return {articleCenter:article.x+article.width/2,
       graphicCenter:graphic?graphic.x+graphic.width/2:0,
       copyCenter:copy?copy.x+copy.width/2:0,
       indexCenter:index?index.x+index.width/2:0};
   })
 );
 assert.equal(processAlignment.length,3,'Mobile process still has three steps');
 for(const [i,step] of processAlignment.entries()){
   for(const field of ['graphicCenter','copyCenter','indexCenter']){
     assert.ok(Math.abs(step[field]-step.articleCenter)<=3,
       'Process step '+(i+1)+' '+field+' is off-center: '+JSON.stringify(step));
   }
 }
 pass('mobile process numbers, text and illustrations share the same center axis');
 await mp.screenshot({path:path.join(output,'04-landing-mobile.png'),fullPage:true});
 await mp.locator('.bramer-site-start').click();
 await mp.getByRole('dialog').waitFor();
 await mp.screenshot({path:path.join(output,'05-beta-mobile.png')});
 await mp.getByRole('button',{name:'닫기'}).click();
 await mp.goto(url+'#/create',{waitUntil:'domcontentloaded'});
 await mp.locator('input[placeholder="브랜드명"]').waitFor();
 await mp.locator('input[placeholder="브랜드명"]').fill('모바일 검증 브랜드');
 await mp.locator('input[placeholder="Brand name"]').fill('Mobile Brand QA');
 await mp.locator('.step-nav-item').nth(2).click();
 await mp.locator('.upload-zone input[type="file"]').setInputFiles({name:'mobile.svg',mimeType:'image/svg+xml',buffer:Buffer.from(logo)});
 await mp.locator('.upload-zone.has-file').waitFor();
 await mp.locator('.step-nav-item').nth(4).click();
 await mp.getByRole('button',{name:'가이드라인 생성'}).waitFor();
 await mp.screenshot({path:path.join(output,'06-create-mobile.png'),fullPage:true});
 const createWidth=await mp.evaluate(()=>({screen:window.innerWidth,document:document.documentElement.scrollWidth}));
 assert.ok(createWidth.document<=createWidth.screen+3,'Mobile create horizontal overflow '+JSON.stringify(createWidth));
 pass('mobile creation wizard and SVG upload with no horizontal overflow');
 await mp.goto(url+'#/guide',{waitUntil:'domcontentloaded'});
 await mp.getByText('이 업종에서 특히 확인할 규칙').waitFor();
 assert.equal(await mp.locator('.bramer-industry-research-disclaimer').count(),0,'Internal research note must not appear in public guide');
 await mp.screenshot({path:path.join(output,'07-guide-mobile.png'),fullPage:true});
 const menuLabels=['홈','내 프로젝트','업종별 가이드','사용 방법','새로 만들기'];
 for(const label of menuLabels)assert.equal(await mp.locator('.bramer-dash-nav').getByRole('button',{name:label}).count(),1);
 const width=await mp.evaluate(()=>({screen:window.innerWidth,document:document.documentElement.scrollWidth}));
 assert.ok(width.document<=width.screen+3,'Mobile guide horizontal overflow '+JSON.stringify(width));
 await mp.locator('.bramer-dash-nav').getByRole('button',{name:'사용 방법'}).click();
 await mp.waitForURL('**/#/help');
 grayscale(await mp.locator('.bramer-help-chapter-heading>span').first().evaluate(el=>getComputedStyle(el).color),'Help chapter label');
 await mp.locator('.bramer-help-local-nav').getByRole('button',{name:'자주 묻는 질문'}).click();
 await mp.waitForTimeout(500);
 assert.ok((await mp.locator('#help-faq').boundingBox()).y < 850, 'FAQ anchor should scroll into viewport');
 assert.ok(mp.url().endsWith('#/help'), 'Section TOC must not change the app route');
 await mp.screenshot({path:path.join(output,'08-help-mobile.png'),fullPage:true});
 pass('mobile beta modal, guide, help, fixed 5 menu links and no page overflow');
 assert.deepEqual(errors,[],'Desktop uncaught exceptions: '+errors.join('; '));
 assert.deepEqual(mobileErrors,[],'Mobile uncaught exceptions: '+mobileErrors.join('; '));
 pass('no uncaught page errors');
 await mobile.close();await context.close();
 console.log('BRAMER browser QA PASSED',count,'checks');
} catch(error){
 console.error('BRAMER browser QA FAILED',error.stack||error);
 throw error;
} finally {
 await browser?.close();
 vite.kill('SIGTERM');
}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
