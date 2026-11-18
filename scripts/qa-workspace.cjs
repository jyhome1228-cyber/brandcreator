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
assert.ok(help.includes('계정 및 클라우드 동기화 기능이 없습니다'));
assert.ok(dash.includes('실무적 제안') || dash.includes('실무적 제안'));
assert.ok(dash.includes('22개 브랜드 사례 분석'));
console.log('PASS 8 industries with differentiated important/optional/beyond requirements');
console.log('PASS consistent workspace menus on creation, guide, project list, help and editor');
console.log('PASS how-to routing, local-storage disclosure and research evidence disclaimer');
assert.ok(help.includes('bramer-help-document'),'Help page should provide a document reading column');
assert.ok(help.includes('bramer-help-local-nav'),'Help page should provide a sectional table of contents');
for(const section of ['help-overview','help-steps','help-files','help-output','help-faq']){
  assert.ok(help.includes('id="'+section+'"'),'Missing help anchor: '+section);
  assert.ok(help.includes('href="#'+section+'"'),'Missing help navigation link: '+section);
}
assert.ok(help.includes('BRAMER 사용 가이드'));
assert.ok(help.includes('내 프로젝트') || help.includes('이전 프로젝트'));
console.log('PASS editorial documentation hierarchy and linked sections');
