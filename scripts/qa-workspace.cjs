const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');

const root = path.resolve(__dirname,'..');
function load(relative) {
  const source = fs.readFileSync(path.join(root,relative),'utf8');
  const compiled = ts.transpileModule(source,{fileName:relative,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports:{}};
  vm.runInThisContext('(function(module,exports) {'+compiled+'\n})',{filename:relative})(module,module.exports);
  return module.exports;
}
const {INDUSTRY_PRIORITIES} = load('src/engines/industryPriorities.ts');
const {INDUSTRIES} = load('src/engines/industryRecommendations.ts');
const nav = fs.readFileSync(path.join(root,'src/components/WorkspaceNav.tsx'),'utf8');
const app = fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
const dash = fs.readFileSync(path.join(root,'src/Dashboard.tsx'),'utf8');
const projects = fs.readFileSync(path.join(root,'src/ProjectLibrary.tsx'),'utf8');
const help = fs.readFileSync(path.join(root,'src/HelpView.tsx'),'utf8');

assert.equal(INDUSTRIES.length,8);
for (const {id,label} of INDUSTRIES) {
  const entry = INDUSTRY_PRIORITIES[id];
  assert.ok(entry,'Missing guide for '+label);
  assert.ok(entry.context.length>30,'Missing context for '+label);
  assert.ok(entry.important.length>=4,'Missing priorities for '+label);
  assert.ok(entry.optional.length>=1,'Missing optional cases for '+label);
  assert.ok(entry.beyond.length>=1,'Missing out-of-scope notes for '+label);
  assert.ok(entry.check.length>=3,'Missing QA questions for '+label);
  for(const priority of entry.important){
    assert.ok(priority.title && priority.why && priority.output,'Incomplete priority for '+label);
  }
}
for(const label of ['홈','내 프로젝트','업종별 가이드','사용 방법','새로 만들기']){
  assert.ok(nav.includes("label: '"+label+"'"),'Missing shared menu '+label);
}
assert.ok(!dash.includes('<div className="bramer-dash-nav">'),'Dashboard has divergent hardcoded menu');
assert.ok(!projects.includes('<div className="bramer-dash-nav">'),'Project library has divergent hardcoded menu');
assert.ok(dash.includes('<WorkspaceNav active='));
assert.ok(projects.includes('<WorkspaceNav active="projects"'));
assert.ok(help.includes('<WorkspaceNav active="help"'));
assert.ok(app.includes('<WorkspaceNav active="create"'));
assert.ok(app.includes('className="bramer-editor-global-menu"'));
assert.ok(app.includes("mode === 'help'"));
assert.ok(app.includes("window.location.hash = '/help'"));
assert.ok(help.includes('클라우드 동기화 기능은 아직 제공하지 않습니다'));
assert.ok(dash.includes('bramer-industry-priorities'),'Industry priorities remain available');
assert.ok(!dash.includes('22개 브랜드 사례 분석'),'Internal research status should not appear in the public guide');
console.log('PASS 8 industries with differentiated important/optional/beyond requirements');
console.log('PASS consistent workspace menus on creation, guide, project list, help and editor');
console.log('PASS how-to routing, local-storage disclosure and streamlined industry guidance');
assert.ok(help.includes('bramer-help-document'),'Help page should provide a document reading column');
assert.ok(help.includes('bramer-help-local-nav'),'Help page should provide a sectional table of contents');
for(const section of ['help-overview','help-steps','help-files','help-output','help-faq']){
  assert.ok(help.includes('id="'+section+'"'),'Missing help anchor: '+section);
  assert.ok(help.includes("document.getElementById('"+section+"')"),'Missing in-page scroll action: '+section);
}
assert.ok(help.includes('BRAMER 사용 가이드'));
assert.ok(help.includes('내 프로젝트') || help.includes('이전 프로젝트'));
console.log('PASS editorial documentation hierarchy and linked sections');

/** BRAMER UI must remain grayscale; user-defined brand colors are intentionally excluded. */
const entry = fs.readFileSync(path.join(root,'src/main.tsx'),'utf8');
const uiStyles = [...entry.matchAll(/import ['"]\.\/([^'"]+\.css)['"]/g)].map(match=>match[1]);
const isPurple = (red,green,blue) => {
  const r=red/255,g=green/255,b=blue/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  if(delta<0.015 || delta/(max||1) <= 0.08) return false;
  let h= max===r ? ((g-b)/delta)%6 : max===g ? (b-r)/delta+2 : (r-g)/delta+4;
  h=(h*60+360)%360;
  return h>=245 && h<=335;
};
for(const file of uiStyles){
  const css=fs.readFileSync(path.join(root,'src',file),'utf8');
  const hexes=[...css.matchAll(/#([0-9a-fA-F]{6})\b/g)];
  for(const match of hexes){
    const rgb=[0,2,4].map(start=>parseInt(match[1].slice(start,start+2),16));
    assert.ok(!isPurple(...rgb),file+' still contains a purple accent: '+match[0]);
  }
  for(const match of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)){
    assert.ok(!isPurple(...match.slice(1,4).map(Number)),file+' still contains a purple RGB accent: '+match[0]);
  }
}
console.log('PASS all imported BRAMER UI styles contain no purple/violet color accents');
