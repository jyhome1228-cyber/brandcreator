export type WorkspaceView = 'create' | 'projects' | 'guide' | 'help';
export type WorkspaceNavProps = {
  active: WorkspaceView;
  onHome: () => void;
  onProjects: () => void;
  onGuide: () => void;
  onHelp: () => void;
  onNew: () => void;
};

const NAV = [
  { id: 'home', label: '홈' },
  { id: 'projects', label: '내 프로젝트' },
  { id: 'guide', label: '업종별 가이드' },
  { id: 'help', label: '사용 방법' },
  { id: 'create', label: '새로 만들기' },
] as const;

export default function WorkspaceNav({active,onHome,onProjects,onGuide,onHelp,onNew}:WorkspaceNavProps) {
  const actions = { home:onHome, projects:onProjects, guide:onGuide, help:onHelp, create:onNew };
  return <div className="bramer-dash-nav" aria-label="BRAMER 작업 메뉴">
    {NAV.map(item => <button
      type="button" key={item.id}
      className={active === item.id ? 'active' : ''}
      aria-current={active === item.id ? 'page' : undefined}
      onClick={actions[item.id]}
    >{item.label}</button>)}
  </div>;
}
