import WorkspaceNav from './components/WorkspaceNav';

type Props = {
  onHome:()=>void;
  onProjects:()=>void;
  onGuide:()=>void;
  onNew:()=>void;
  onHelp:()=>void;
};

const steps = [
  {number:'01',title:'브랜드 정보 입력',description:'브랜드명과 영문명, 브랜드 소개와 공식 슬로건을 등록합니다.',detail:'입력한 문구는 Brand Overview와 Brand Message에 반영됩니다. 없는 내용을 BRAMER가 임의로 채우지 않습니다.'},
  {number:'02',title:'업종별 기준 검토',description:'8개 업종의 특징을 참고하고, 특히 확인해야 할 사용 규칙을 검토합니다.',detail:'기본 17개 제작 항목은 업종에 관계없이 같으며, 업종별 가이드는 참고용 제안입니다.'},
  {number:'03',title:'SVG 로고 업로드',description:'Illustrator에서 SVG로 저장한 원본 로고를 업로드합니다.',detail:'업로드 후 로고의 실제 영역, 비율, 색상을 분석합니다. AI 원본 파일 자체는 직접 업로드할 수 없습니다.'},
  {number:'04',title:'컬러·서체·사용 규정',description:'브랜드 컬러, 제목·본문 서체, 로고 보호 공간과 최소 크기를 설정합니다.',detail:'자동 계산된 보호 공간·최소 크기는 검토용 제안값입니다. 승인된 브랜드 규정과 비교해야 합니다.'},
  {number:'05',title:'결과물 생성·출력',description:'명함·스티커·레터헤드·봉투 정보를 입력하고 26페이지 가이드라인을 생성합니다.',detail:'가이드라인을 검토한 뒤 PDF 및 SVG로 출력하고, 프로젝트 JSON을 별도로 백업할 수 있습니다.'},
] as const;

const questions = [
 {title:'이전 작업은 어디에서 다시 열 수 있나요?',answer:'왼쪽의 내 프로젝트에서 현재 브라우저에 자동 저장된 프로젝트를 열 수 있습니다. 회원 계정이나 클라우드 동기화 기능은 아직 제공하지 않습니다.'},
 {title:'다른 컴퓨터에서도 같은 프로젝트를 사용할 수 있나요?',answer:'제작 화면의 JSON 백업 파일을 보관한 후 다른 기기에서 프로젝트 불러오기를 사용해 복원할 수 있습니다. 브라우저 저장 데이터가 삭제되면 로컬 프로젝트가 사라질 수 있습니다.'},
 {title:'Adobe Illustrator의 AI 파일을 바로 업로드할 수 있나요?',answer:'현재는 SVG 파일만 지원합니다. Illustrator에서 파일 → 다른 이름으로 저장 → SVG를 선택해 내보내 주세요.'},
 {title:'자동 생성된 로고 규칙을 바로 납품해도 되나요?',answer:'최소 크기와 보호 공간은 제안값입니다. 실제 브랜드의 승인된 규정, 사용 매체, 인쇄 및 디지털 환경을 확인한 후 확정해 주세요.'},
 {title:'명함·스티커·봉투는 바로 인쇄 가능한가요?',answer:'편집 가능한 기본 SVG 디자인을 제공합니다. 인쇄 전 도련, 도무송, 봉투 전개도, 인쇄 컬러와 서체를 별도로 확인해야 합니다.'},
] as const;

export default function HelpView({onHome,onProjects,onGuide,onNew,onHelp}:Props) {
 return <div className="bramer-dash bramer-help-page">
  <header className="bramer-dash-header">
    <button type="button" className="bramer-dash-logo" onClick={onHome}>BRAMER.</button>
    <span className="bramer-dash-product">브랜드 가이드라인 제작</span>
    <button type="button" className="bramer-dash-header-start" onClick={onNew}>새 가이드라인 만들기</button>
  </header>
  <div className="bramer-dash-layout">
    <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
      <div>
        <WorkspaceNav active="help" onHome={onHome} onProjects={onProjects} onGuide={onGuide} onHelp={onHelp} onNew={onNew}/>
        <nav className="bramer-help-local-nav" aria-label="사용 방법 목차">
          <span>문서 목차</span>
          <a href="#help-overview">시작하기</a>
          <a href="#help-steps">제작 과정</a>
          <a href="#help-files">준비할 자료</a>
          <a href="#help-output">결과물과 저장</a>
          <a href="#help-faq">자주 묻는 질문</a>
        </nav>
      </div>
      <div className="bramer-dash-sidebar-bottom"><p>브랜드 가이드라인 제작을 위한 BRAMER 사용 안내입니다.</p></div>
    </aside>
    <main className="bramer-dash-content bramer-help-content">
      <div className="bramer-help-document">
        <section id="help-overview" className="bramer-help-intro">
          <p className="bramer-dash-eyebrow">BRAMER GUIDE / GETTING STARTED</p>
          <h1>BRAMER 사용 가이드</h1>
          <p className="bramer-help-lead">로고부터 브랜드 가이드라인까지, 처음 시작하는 데 필요한 내용을 한곳에서 확인하세요.</p>
          <div className="bramer-help-intro-actions">
            <button type="button" className="bramer-dash-primary" onClick={onNew}>가이드라인 만들기</button>
            <button type="button" className="bramer-help-secondary" onClick={onProjects}>이전 프로젝트 열기</button>
          </div>
        </section>

        <section className="bramer-help-hero-graphic" aria-label="BRAMER 제작 흐름">
          <div className="bramer-help-hero-brand">
            <span>BRAMER.</span>
            <small>Brand Identity Guidelines</small>
          </div>
          <div className="bramer-help-graphic-steps">
            <div><b>01</b><span>Brand Information</span></div>
            <div><b>02</b><span>SVG Logo</span></div>
            <div><b>03</b><span>Guideline System</span></div>
            <div><b>04</b><span>PDF / SVG</span></div>
          </div>
          <span className="bramer-help-hero-footer">FROM LOGO TO BRAND GUIDELINES</span>
        </section>

        <section id="help-steps" className="bramer-help-chapter">
          <div className="bramer-help-chapter-heading"><span>01 / QUICK START</span><h2>제작 과정</h2><p>다섯 단계로 브랜드 시스템을 설정한 뒤 최종 가이드라인을 확인합니다.</p></div>
          <div className="bramer-help-steps-list">
            {steps.map(step=><article key={step.number} className="bramer-help-step">
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.description}</p><small>{step.detail}</small></div>
            </article>)}
          </div>
        </section>

        <section id="help-files" className="bramer-help-chapter">
          <div className="bramer-help-chapter-heading"><span>02 / PREPARATION</span><h2>준비할 자료</h2><p>처음에는 필수 정보만 입력하고, 명함과 서식을 만들 때 추가 정보를 받습니다.</p></div>
          <div className="bramer-help-info-grid">
            <article><span>기본 자료</span><strong>브랜드명 · 로고 · 컬러</strong><p>국문·영문 브랜드명, SVG 로고, 브랜드 컬러와 제목·본문 서체.</p></article>
            <article><span>브랜드 내용</span><strong>소개 · 슬로건</strong><p>브랜드를 설명하는 공식 문구와 주요 메시지를 입력해 주세요.</p></article>
            <article><span>응용 정보</span><strong>연락처 · 회사 주소</strong><p>명함·레터헤드·봉투에 활용할 이름, 직책, 이메일, 회사 정보를 입력합니다.</p></article>
          </div>
          <button type="button" className="bramer-help-text-link" onClick={onGuide}>업종별로 참고할 규칙 살펴보기</button>
        </section>

        <section id="help-output" className="bramer-help-chapter">
          <div className="bramer-help-chapter-heading"><span>03 / OUTPUT & SAVE</span><h2>결과물과 프로젝트 저장</h2><p>최종 가이드라인 출력과 이후 수정할 수 있는 프로젝트 백업은 서로 다른 기능입니다.</p></div>
          <div className="bramer-help-output-grid">
            <div><span>01</span><strong>PDF</strong><p>26페이지 A4 가로형 가이드라인을 출력합니다.</p></div>
            <div><span>02</span><strong>SVG</strong><p>페이지별 벡터 디자인과 기본 응용 디자인을 내보냅니다.</p></div>
            <div><span>03</span><strong>프로젝트 JSON</strong><p>편집 데이터를 백업하고 다른 기기에서 가져올 수 있습니다.</p></div>
          </div>
          <div className="bramer-help-storage-note"><strong>저장 안내</strong><p>현재 프로젝트는 이 브라우저에 자동 저장됩니다. 계정별 클라우드 저장은 제공하지 않으므로 중요한 작업은 JSON 파일로도 백업해 주세요.</p></div>
        </section>

        <section id="help-faq" className="bramer-help-chapter bramer-help-faq">
          <div className="bramer-help-chapter-heading"><span>04 / SUPPORT</span><h2>자주 묻는 질문</h2><p>작업 중 자주 발생하는 궁금증을 정리했습니다.</p></div>
          {questions.map(item=><details key={item.title}><summary>{item.title}</summary><p>{item.answer}</p></details>)}
        </section>
        <footer className="bramer-help-document-footer"><span>BRAMER.</span><span>브랜드 가이드라인 제작 안내</span></footer>
      </div>
    </main>
  </div>
 </div>;
}
