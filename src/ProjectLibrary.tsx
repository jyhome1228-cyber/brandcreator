import WorkspaceNav from './components/WorkspaceNav';
import BramerLogo from './components/BramerLogo';
import type { SavedBramerProject } from './engines/projectLibrary';

type Props = {
  projects: SavedBramerProject[];
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onNew: () => void;
  onBack: () => void;
  onGuide: () => void;
  onHelp: () => void;
  error: string;
};

export default function ProjectLibrary({projects,onOpen,onRemove,onNew,onBack,onGuide,onHelp,error}:Props) {
  return <div className="bramer-dash bramer-projects-page">
    <header className="bramer-dash-header">
      <button type="button" className="bramer-dash-logo" onClick={onBack} aria-label="BRAMER 홈"><BramerLogo /></button>
      <span className="bramer-dash-product">브랜드 가이드라인 제작</span>
      <button type="button" className="bramer-dash-header-start" onClick={onNew}>새 가이드라인 만들기</button>
    </header>
    <div className="bramer-dash-layout">
      <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
        <WorkspaceNav active="projects" onHome={onBack} onProjects={()=>{}} onGuide={onGuide} onHelp={onHelp} onNew={onNew}/>
        <div className="bramer-dash-sidebar-bottom"><p>이 브라우저에 저장된 프로젝트예요. 다른 기기에서도 사용하려면 JSON 파일을 별도로 백업해 주세요.</p></div>
      </aside>
      <main className="bramer-dash-content bramer-projects-content">
        <div className="bramer-dash-page-title">
          <p className="bramer-dash-eyebrow">프로젝트 보관함</p>
          <h1>내 프로젝트</h1>
          <p>저장해 둔 브랜드 가이드라인을 다시 열어 수정할 수 있어요.</p>
        </div>
        {error ? <p className="bramer-project-error" role="alert">{error}</p> : null}
        <div className="bramer-project-notice">저장 장소: 현재 브라우저 · 계정/클라우드 동기화는 제공하지 않아요. 브라우저 데이터를 삭제하면 프로젝트도 사라질 수 있습니다.</div>
        {projects.length === 0 ?
          <div className="bramer-project-empty">
            <strong>저장된 프로젝트가 없습니다.</strong>
            <p>브랜드명을 입력하고 제작을 시작하면 자동으로 저장됩니다.</p>
            <button type="button" className="bramer-dash-primary" onClick={onNew}>새 프로젝트 시작하기</button>
          </div> :
          <div className="bramer-project-list">
            {projects.map(item => <div className="bramer-project-card" key={item.id}>
              <div>
                <strong>{item.project.name || item.project.englishName || '이름 없는 프로젝트'}</strong>
                <span>{item.project.englishName || '영문 브랜드명 미입력'} · {new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(item.updatedAt)} 저장</span>
              </div>
              <div className="bramer-project-controls">
                <button type="button" className="bramer-project-open" onClick={()=>onOpen(item.id)}>이어서 작업</button>
                <button type="button" className="bramer-project-delete" onClick={()=>onRemove(item.id)} aria-label={item.project.name+' 프로젝트 삭제'}>삭제</button>
              </div>
            </div>)}
          </div>}
      </main>
    </div>
  </div>;
}
