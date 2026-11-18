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
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.bramer-home-hero').waitFor();
 const favicon=await page.locator('link[rel="icon"]').getAttribute('href');
 assert.equal(favicon,'/brandcreator/favicon.svg','Favicon must respect GitHub Pages base URL');
 const faviconResponse=await page.request.get('http://127.0.0.1:'+port+favicon);
 assert.ok(faviconResponse.ok(),'Favicon fetch must succeed at deployed path');
 pass('GitHub Pages base path and favicon work');
 await page.screenshot({path:path.join(output,'01-landing-desktop.png')});
 const trial=page.locator('.bramer-home-primary').first();
 await trial.click();
 await page.getByRole('dialog').waitFor();
 await page.locator('.bramer-beta-form input[autocomplete="name"]').fill('테스트 담당자');
 await page.locator('.bramer-beta-form input[autocomplete="off"]').fill('bramerqa');
 await page.locator('.bramer-beta-form input[type="tel"]').fill('010-1234-5678');
 await page.locator('.bramer-beta-form select').selectOption('디자이너');
 await page.locator('.bramer-beta-consent input').check();
 await page.locator('.bramer-beta-primary[type="submit"]').click();
 await page.waitForURL('**/#/create');
 await page.getByRole('heading',{name:'새 브랜드 가이드라인 만들기'}).waitFor();
 pass('landing → beta form validation → create');
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
 const jsonPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'JSON 백업'}).click();
 const jsonDownload=await jsonPromise;
 const jsonPath=path.join(output,'project-backup.json');
 await jsonDownload.saveAs(jsonPath);
 const backup=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
 assert.equal(backup.project.name,'건강미 테스트');
 assert.ok(backup.project.logo.raw.includes('<svg'));
 pass('JSON backup preserves project SVG');
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
 // Mobile viewport tests: global menus, beta modal and guide navigation.
 const mobile=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,isMobile:true,deviceScaleFactor:1});
 const mp=await mobile.newPage();
 const mobileErrors=[];
 mp.on('pageerror',err=>mobileErrors.push(err.message));
 await mp.goto(url,{waitUntil:'domcontentloaded'});
 await mp.locator('.bramer-home-hero').waitFor();
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
 await mp.screenshot({path:path.join(output,'07-guide-mobile.png'),fullPage:true});
 const menuLabels=['홈','내 프로젝트','업종별 가이드','사용 방법','새로 만들기'];
 for(const label of menuLabels)assert.equal(await mp.locator('.bramer-dash-nav').getByRole('button',{name:label}).count(),1);
 const width=await mp.evaluate(()=>({screen:window.innerWidth,document:document.documentElement.scrollWidth}));
 assert.ok(width.document<=width.screen+3,'Mobile guide horizontal overflow '+JSON.stringify(width));
 await mp.locator('.bramer-dash-nav').getByRole('button',{name:'사용 방법'}).click();
 await mp.waitForURL('**/#/help');
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
