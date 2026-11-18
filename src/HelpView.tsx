import WorkspaceNav from './components/WorkspaceNav';

type Props = {
  onHome:()=>void;
  onProjects:()=>void;
  onGuide:()=>void;
  onNew:()=>void;
  onHelp:()=>void;
};

const steps = [
  {title:'브랜드 정보 입력',description:'브랜드명·영문명·브랜드 소개·공식 슬로건을 등록합니다. 미입력한 브랜드 내용은 임의로 확정하지 않습니다.'},
  {title:'업종별 기본 가이드 확인',description:'8개 업종 중 하나를 선택해 참고할 규칙과 우선 확인 사항을 봅니다. 17개 기본 제작 항목은 업종에 관계없이 동일합니다.'},
  {title:'SVG 로고 업로드',description:'Illustrator 원본 AI 파일은 다른 이름으로 저장 → SVG로 내보낸 뒤 업로드합니다. 로고의 구조·색상과 비율을 분석합니다.'},
  {title:'컬러·서체·사용 규정 설정',description:'브랜드 지정 컬러와 서체, 로고 보호 공간과 최소 사용 크기를 검토·수정합니다. 자동 제안값은 공식 승인 규정이 아닙니다.'},
  {title:'응용 정보 입력 후 문서 생성',description:'명함·스티커·레터헤드·봉투에 사용할 담당자 및 회사 정보를 입력하고 26페이지 가이드라인을 생성합니다.'},
] as const;

export default function HelpView({onHome,onProjects,onGuide,onNew,onHelp}:Props){
 return <div className="bramer-dash bramer-help-page">
  <header className="bramer-dash-header">
    <button type="button" className="bramer-dash-logo" onClick={onHome}>BRAMER.</button>
    <span className="bramer-dash-product">브랜드 가이드라인 제작</span>
    <button type="button" className="bramer-dash-header-start" onClick={onNew}>새 가이드라인 만들기</button>
  </header>
  <div className="bramer-dash-layout">
    <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
      <WorkspaceNav active="help" onHome={onHome} onProjects={onProjects} onGuide={onGuide} onHelp={onHelp} onNew={onNew}/>
      <div className="bramer-dash-sidebar-bottom"><p>모든 작업 화면에서 동일한 메뉴를 사용할 수 있습니다.</p></div>
    </aside>
    <main className="bramer-dash-content">
      <div className="bramer-dash-page-title">
        <p className="bramer-dash-eyebrow">BRAMER / 사용 방법</p>
        <h1>로고 하나에서 가이드라인까지.</h1>
        <p>기본 정보와 SVG를 등록하고 필요한 규칙을 확인한 뒤, 최종 결과물을 편집·내보내는 과정입니다.</p>
      </div>
      <section className="bramer-guide-content bramer-help-steps">
        {steps.map((step,i)=><article key={step.title} className="bramer-help-step">
          <span>{String(i+1).padStart(2,'0')}</span>
          <div><h2>{step.title}</h2><p>{step.description}</p></div>
        </article>)}
        <button type="button" className="bramer-dash-primary" onClick={onNew}>새 프로젝트 시작하기</button>
      </section>
      <section className="bramer-help-faq" aria-label="자주 묻는 질문">
        <h2>자주 묻는 질문</h2>
        <details><summary>기존에 만들던 프로젝트는 어디에서 볼 수 있나요?</summary><p>왼쪽의 ‘내 프로젝트’에서 현재 브라우저에 저장된 작업을 이어서 열 수 있습니다. 현재 서비스에는 실제 회원 계정 및 클라우드 동기화 기능이 없습니다.</p></details>
        <details><summary>다른 컴퓨터에서도 프로젝트를 열 수 있나요?</summary><p>현재는 자동 동기화되지 않습니다. 제작 화면에서 JSON 백업을 다운로드하고 다른 기기에서 프로젝트 불러오기로 복원해 주세요. 브라우저 데이터 삭제 시 저장된 프로젝트가 사라질 수 있습니다.</p></details>
        <details><summary>AI 파일을 바로 업로드할 수 있나요?</summary><p>현재 SVG만 지원합니다. Adobe Illustrator에서 파일 → 다른 이름으로 저장 → SVG를 선택해 저장한 후 업로드하세요.</p></details>
        <details><summary>자동으로 생성된 최소 크기·보호 공간을 바로 사용해도 되나요?</summary><p>프로그램의 제안값이므로 로고의 식별성과 실제 인쇄·디지털 환경을 확인한 뒤 승인해 주세요.</p></details>
        <details><summary>명함·스티커·봉투가 바로 인쇄 가능한가요?</summary><p>현재 출력은 편집 가능한 기본 디자인 SVG입니다. 인쇄 전 도련·도무송·봉투 전개도·서체·인쇄 색상 사양을 확인해야 합니다.</p></details>
      </section>
    </main>
  </div>
 </div>;
}
