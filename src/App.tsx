import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import BramerLogo from './components/BramerLogo';
import { parseLogoSvg } from './engines/svgParser';
import Landing from './Landing';
import TechnicalManifesto from './TechnicalManifesto';
import WelcomeExperience from './WelcomeExperience';
import Dashboard from './Dashboard';
import ProjectLibrary from './ProjectLibrary';
import HelpView from './HelpView';
import WorkspaceNav from './components/WorkspaceNav';
import { deleteLocalProject, listSavedProjects, newProjectId, saveLocalProject, type SavedBramerProject } from './engines/projectLibrary';
import BramerSelect from './components/BramerSelect';
import { INDUSTRY_RATIONALE } from './engines/industryRationale';
import { downloadAllSvg, downloadSvg } from './export/download';
import { CORE_ITEMS, generateV2Pages, generateBusinessCardSvg, generateStickerSvg, generateLetterheadSvg, generateEnvelopeSvg } from './guideline-system/v2Pages';
import { localizeGuidelinePages, type DocumentLanguage } from './guideline-system/localizeGuideline';
import { CATEGORIES, INDUSTRIES, INDUSTRY_GUIDANCE, getDefaultSelection, type GuidelineCategory, type IndustryId } from './engines/industryRecommendations';
import type { BrandProject, GuidelinePage } from './types/guideline';

const FONT_OPTIONS = [
  'Pretendard',
  'Noto Sans KR',
  'SUIT',
  'Wanted Sans',
  'Spoqa Han Sans Neo',
  'Apple SD Gothic Neo',
  'Nanum Gothic',
  'NanumSquare Neo',
  'Gmarket Sans',
  'IBM Plex Sans KR',
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Helvetica Neue',
  'Arial',
  'Noto Serif KR',
  'Georgia',
];

const initialProject: BrandProject = {
  name: '',
  englishName: '',
  description: '',
  slogan: '',
  year: String(new Date().getFullYear()),
  logo: null,
  contact: { personName: '', position: '', phone: '', email: '', website: '', company: '', address: '' },
  colors: {
    primary: '#111111',
    secondary: '#EAEAEA',
    accent: '#767676',
  },
  typography: {
    title: 'Pretendard',
    body: 'Pretendard',
  },
  rules: {
    clearSpace: 0.25,
    minimumPrintMm: 10,
    minimumDigitalPx: 40,
  },
};

function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export default function App() {
  const [project, setProject] = useState<BrandProject>(initialProject);
  const [mode, setMode] = useState<'landing' | 'manifesto' | 'welcome' | 'dashboard' | 'guide' | 'setup' | 'editor' | 'projects' | 'help'>(() => location.hash === '#/technology' ? 'manifesto' : location.hash === '#/create' || location.hash === '#/editor' ? 'setup' : location.hash === '#/dashboard' ? 'dashboard' : location.hash === '#/welcome' ? 'landing' : location.hash === '#/guide' ? 'guide' : location.hash === '#/projects' ? 'projects' : location.hash === '#/help' ? 'help' : 'landing');
  const [showFirstCoach, setShowFirstCoach] = useState(false);
  const [welcomeLanguage, setWelcomeLanguage] = useState<'ko'|'en'>(() => {
    try { return localStorage.getItem('bramer-site-language')==='en'?'en':'ko'; } catch { return 'ko'; }
  });
  const hasBetaSession = () => {
    try { return sessionStorage.getItem('bramer-beta-session-v1') === 'active'; }
    catch { return false; }
  };
  const openManifesto = () => {
    window.location.hash = '/technology';
    setMode('manifesto');
    window.scrollTo({top:0,behavior:'instant'});
  };
  const enterBetaFromManifesto = () => {
    try {sessionStorage.setItem('bramer-open-registration-v1','1');} catch { /* Optional flag */ }
    window.location.hash = '/';
    setMode('landing');
    window.scrollTo({top:0,behavior:'instant'});
  };
    const goToDashboard = () => {
    window.location.hash = '/dashboard';
    setMode('dashboard');
    window.scrollTo({top:0,behavior:'instant'});
  };
  const finishWelcome = () => {
    try { localStorage.setItem('bramer-onboarding-v1','seen'); } catch { /* Optional preference */ }
    setShowFirstCoach(true);
    goToDashboard();
  };
  const enterWorkspace = (newRegistration = false) => {
    if(newRegistration) {
      try {setWelcomeLanguage(localStorage.getItem('bramer-site-language')==='en'?'en':'ko');} catch {setWelcomeLanguage('ko');}
      window.location.hash = '/welcome';
      setMode('welcome');
      window.scrollTo({top:0,behavior:'instant'});
      return;
    }
    goToDashboard();
  };
  const openCreate = (nextIndustry?: IndustryId) => {
    if (nextIndustry) {
      setIndustry(nextIndustry);
      setSelectedCategories(getDefaultSelection(nextIndustry));
      setSetupStep(2);
    } else setSetupStep(1);
    window.location.hash = '/create';
    setMode('setup');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const navigateWorkspace = (view: 'dashboard' | 'guide') => {
    if (view === 'guide') {
      window.location.hash = '/guide';
      setMode('guide');
    } else {
      window.location.hash = '/create';
      setMode('setup');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const goHome = () => {
    window.location.hash = '/';
    setMode('landing');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => {
    const syncRoute = () => {
      if (window.location.hash === '#/technology') setMode('manifesto');
      else if (window.location.hash === '#/dashboard') setMode('dashboard');
      else if (window.location.hash === '#/welcome') setMode(previous => previous === 'welcome' ? previous : 'landing');
      else if (window.location.hash === '#/guide') setMode('guide');
      else if (window.location.hash === '#/projects') setMode('projects');
      else if (window.location.hash === '#/help') setMode('help');
      else if (window.location.hash === '#/create') setMode('setup');
      else if (window.location.hash === '#/editor') setMode(previous => previous === 'editor' ? 'editor' : 'setup');
      else setMode('landing');
    };
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentId, setCurrentId] = useState('01-cover');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [industry, setIndustry] = useState<IndustryId>('service');
  const [selectedCategories, setSelectedCategories] = useState<GuidelineCategory[]>(getDefaultSelection('service'));
  const [projectId, setProjectId] = useState(() => newProjectId());
  const [hydrated, setHydrated] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedBramerProject[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [libraryError, setLibraryError] = useState('');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSnapshot = (): SavedBramerProject => ({
    id: projectId, updatedAt: Date.now(), project, industry, selectedCategories, enabled, step: setupStep,
  });
  const hasDraftContent = () => Boolean(
    project.name.trim() || project.englishName.trim() || project.description.trim() ||
    project.slogan.trim() || project.logo || setupStep > 1 ||
    project.colors.primary !== initialProject.colors.primary ||
    project.colors.secondary !== initialProject.colors.secondary ||
    project.colors.accent !== initialProject.colors.accent ||
    Object.values(project.contact ?? {}).some(value=>typeof value==='string' && value.trim())
  );
  const refreshProjects = async () => {
    try { setSavedProjects(await listSavedProjects()); setLibraryError(''); }
    catch (e) { setLibraryError(e instanceof Error ? e.message : '저장된 프로젝트를 불러오지 못했습니다.'); }
  };
  const saveToBrowser = async (): Promise<boolean> => {
    if (!hasDraftContent()) return false;
    setSaveStatus('saving');
    try {
      await saveLocalProject(currentSnapshot());
      try { localStorage.setItem('bramer-active-project-v1',projectId); } catch { /* browser may block storage */ }
      setSaveStatus('saved');
      await refreshProjects();
      return true;
    } catch (e) {
      setSaveStatus('error');
      setLibraryError(e instanceof Error ? e.message : '브라우저 저장에 실패했습니다. JSON 파일로 백업해 주세요.');
      return false;
    }
  };
  useEffect(() => {
    let cancelled=false;
    const restoreActive = async () => {
      try {
        const list=await listSavedProjects();
        if(cancelled) return;
        setSavedProjects(list);
        let activeId: string | null = null;
        try { activeId=localStorage.getItem('bramer-active-project-v1'); } catch { /* private browsing */ }
        const current=list.find(item=>item.id===activeId) ?? (!activeId ? list[0] : undefined);
        if(current && (window.location.hash==='#/create' || window.location.hash==='#/editor' || window.location.hash==='#/dashboard')) {
          const restoredLogo=current.project.logo?.raw && current.project.logo.fileName
            ? parseLogoSvg(current.project.logo.raw,current.project.logo.fileName) : null;
          setProjectId(current.id);
          setProject({...current.project,logo:restoredLogo});
          setIndustry(current.industry);
          setSelectedCategories(current.selectedCategories ?? getDefaultSelection(current.industry));
          setEnabled(current.enabled ?? {});
          setSetupStep(Math.max(1,Math.min(5,current.step)) as 1|2|3|4|5);
          setCurrentId('01-cover');
        }
      } catch(e) {
        if(!cancelled) setLibraryError(e instanceof Error ? e.message : '프로젝트 자동 복원에 실패했습니다. 내 프로젝트에서 다시 열어 주세요.');
      } finally { if(!cancelled) setHydrated(true); }
    };
    void restoreActive();
    return () => { cancelled=true; };
  }, []);
  useEffect(() => {
    if (!hydrated || !hasDraftContent()) return;
    setSaveStatus('saving');
    autosaveTimer.current = setTimeout(() => { void saveToBrowser(); }, 550);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [hydrated, project, projectId, industry, selectedCategories, enabled, setupStep]);
  // On tab backgrounding, commit the latest state immediately rather than
  // waiting for the 550ms debounce. A browser may still terminate mid-write.
  useEffect(() => {
    if(!hydrated) return;
    const flush = () => {
      if(document.visibilityState !== 'hidden' || !hasDraftContent()) return;
      if(autosaveTimer.current) clearTimeout(autosaveTimer.current);
      void saveLocalProject(currentSnapshot()).catch(() => {});
    };
    document.addEventListener('visibilitychange',flush);
    return () => document.removeEventListener('visibilitychange',flush);
  },[hydrated,project,projectId,industry,selectedCategories,enabled,setupStep]);
  const openHelp = () => {
    window.location.hash = '/help';
    setMode('help');
    window.scrollTo({top:0,behavior:'instant'});
  };
  const openGuide = () => {
    window.location.hash = '/guide';
    setMode('guide');
    window.scrollTo({top:0,behavior:'instant'});
  };
  const openProjectLibrary = async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (hasDraftContent()) await saveToBrowser();
    await refreshProjects();
    window.location.hash = '/projects';
    setMode('projects');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const createNewProject = async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (hasDraftContent()) await saveToBrowser();
    const nextId=newProjectId();
    try { localStorage.setItem('bramer-active-project-v1',nextId); } catch { /* unavailable */ }
    setProject({ ...initialProject, year: String(new Date().getFullYear()), contact:{...initialProject.contact!}, colors:{...initialProject.colors}, typography:{...initialProject.typography}, rules:{...initialProject.rules} });
    setProjectId(nextId); setIndustry('service'); setSelectedCategories(getDefaultSelection('service'));
    setEnabled({}); setCurrentId('01-cover'); setSetupStep(1); setError(''); setSaveStatus('idle');
    window.location.hash='/create'; setMode('setup');
    window.scrollTo({ top:0, behavior:'instant' });
  };
  const resumeSavedProject = async (id: string) => {
    try {
      const entries = await listSavedProjects();
      const item = entries.find(entry => entry.id === id);
      if (!item) throw new Error('선택한 프로젝트를 찾을 수 없습니다.');
      const restoredLogo = item.project.logo?.raw && item.project.logo.fileName ?
        parseLogoSvg(item.project.logo.raw,item.project.logo.fileName) : null;
      setProjectId(item.id);
      try { localStorage.setItem('bramer-active-project-v1',item.id); } catch { /* unavailable */ }
      setProject({...item.project,logo:restoredLogo});
      setIndustry(item.industry);
      setSelectedCategories(item.selectedCategories);
      setEnabled(item.enabled ?? {});
      setSetupStep(Math.min(5,Math.max(1,item.step)) as 1|2|3|4|5);
      setError('');setSaveStatus('saved');
      window.location.hash='/create';setMode('setup');
      window.scrollTo({top:0,behavior:'instant'});
    } catch(e) {setLibraryError(e instanceof Error ? e.message : '프로젝트를 열지 못했습니다.');}
  };
  const removeSavedProject = async (id: string) => {
    if (!window.confirm('이 프로젝트를 브라우저에서 삭제할까요? 복구할 수 없습니다.')) return;
    try { await deleteLocalProject(id); await refreshProjects(); }
    catch(e) {setLibraryError(e instanceof Error ? e.message : '프로젝트를 삭제하지 못했습니다.');}
  };

  const [documentLanguage, setDocumentLanguage] = useState<DocumentLanguage>(() => { try { return localStorage.getItem('bramer-document-language') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } });
  const selectDocumentLanguage = (value: DocumentLanguage) => { setDocumentLanguage(value); try { localStorage.setItem('bramer-document-language',value); } catch { /* Optional preference */ } };
  const pages = useMemo(() => localizeGuidelinePages(generateV2Pages(project), documentLanguage), [project, documentLanguage]);
  const changeIndustry = (value: IndustryId) => {
    setIndustry(value);
    setSelectedCategories(getDefaultSelection(value));
  };

  const currentPage = pages.find((page) => page.id === currentId) ?? pages[0];
  const currentPageNumber = Math.max(1, pages.findIndex(page => page.id === currentPage?.id) + 1);
  const enabledPages = pages.filter((page) => enabled[page.id] !== false);
  const industryLabel = INDUSTRIES.find(item => item.id === industry)?.label ?? '브랜드';
  const selectedCount = CORE_ITEMS.length;
  const setupChecks = [
    Boolean(project.name.trim()),
    Boolean(project.englishName.trim()),
    Boolean(project.logo),
    isHex(project.colors.primary),
    Boolean(project.typography.title && project.typography.body),
  ];
  const setupProgress = Math.round((setupChecks.filter(Boolean).length / setupChecks.length) * 100);
  const stepStatus = {
    1: Boolean(project.name.trim() && project.englishName.trim()),
    2: selectedCategories.length > 0,
    3: Boolean(project.logo),
    4: Boolean(isHex(project.colors.primary) && project.typography.title && project.typography.body),
    5: Boolean(project.rules.clearSpace > 0 && project.rules.minimumPrintMm > 0 && project.rules.minimumDigitalPx > 0),
  } as const;
  const recommendationsApplied = Boolean(
    project.logo &&
    project.rules.clearSpace === project.logo.analysis.recommendation.clearSpace &&
    project.rules.minimumPrintMm === project.logo.analysis.recommendation.minimumPrintMm &&
    project.rules.minimumDigitalPx === project.logo.analysis.recommendation.minimumDigitalPx
  );
  const sectionLabels: Record<GuidelinePage['section'], string> = {
    intro: 'INTRO',
    logo: 'LOGO',
    color: 'COLOR',
    typography: 'TYPOGRAPHY',
    graphic: 'GRAPHIC',
    photography: 'PHOTOGRAPHY',
    verbal: 'VERBAL',
    application: 'APPLICATION',
    end: 'END',
  };

  const updateProject = <K extends keyof BrandProject>(key: K, value: BrandProject[K]) => {
    setProject((previous) => ({ ...previous, [key]: value }));
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (/\.ai$/i.test(file.name)) {
      setError('AI 파일은 직접 업로드할 수 없어요. Illustrator에서 로고를 연 뒤, 파일 > 다른 이름으로 저장 > 파일 형식 SVG를 선택해 저장한 후 다시 업로드해 주세요.');
      event.target.value = '';
      return;
    }
    try {
      const raw = await file.text();
      const logo = parseLogoSvg(raw, file.name);
      setProject((previous) => {
        const suggested = logo.colors.find((color) => !['#FFFFFF', '#000000'].includes(color));
        return {
          ...previous,
          logo,
          colors: {
            ...previous.colors,
            primary: previous.colors.primary === '#111111' && suggested ? suggested : previous.colors.primary,
          },
        };
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'SVG 파일을 불러오지 못했습니다.');
    }
  };

  const applyLogoRecommendations = () => {
    if (!project.logo) return;
    const recommendation = project.logo.analysis.recommendation;
    setProject((previous) => ({
      ...previous,
      rules: {
        ...previous.rules,
        clearSpace: recommendation.clearSpace,
        minimumPrintMm: recommendation.minimumPrintMm,
        minimumDigitalPx: recommendation.minimumDigitalPx,
      },
    }));
  };

  const restoreProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('project' in data) || !data.project || typeof data.project !== 'object') {
        throw new Error('올바른 브레이머 프로젝트 파일이 아닙니다.');
      }
      const snapshot = data as { project: BrandProject; industry?: IndustryId; selectedCategories?: GuidelineCategory[]; enabled?: Record<string, boolean> };
      if (typeof snapshot.project.name !== 'string' || typeof snapshot.project.englishName !== 'string' || !snapshot.project.colors || !snapshot.project.typography || !snapshot.project.rules) {
        throw new Error('프로젝트 파일에 필수 브랜드 정보가 없습니다.');
      }
      const restoredIndustry = INDUSTRIES.some(item => item.id === snapshot.industry) ? snapshot.industry! : 'service';
      const restoredModules = Array.isArray(snapshot.selectedCategories)
        ? CATEGORIES.filter(item => snapshot.selectedCategories!.includes(item.id)).map(item => item.id)
        : getDefaultSelection(restoredIndustry);
      const saved = snapshot.project;
      const safeLogo = saved.logo && typeof saved.logo.raw === 'string' && typeof saved.logo.fileName === 'string'
        ? parseLogoSvg(saved.logo.raw, saved.logo.fileName)
        : null;
      setIndustry(restoredIndustry);
      setSelectedCategories(restoredModules);
      const importedId=newProjectId();
      setProjectId(importedId);
      try { localStorage.setItem('bramer-active-project-v1',importedId); } catch { /* unavailable */ }
      setProject({ ...saved, logo: safeLogo });
      setEnabled(snapshot.enabled || {});
      setCurrentId('01-cover');
      setSetupStep(1);
      setMode('setup');
      window.location.hash = '/create';
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '프로젝트 파일을 열지 못했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const generate = () => {
    if (!project.name.trim()) {
      setError('브랜드명을 입력해주세요.');
      return;
    }
    if (!project.englishName.trim()) {
      setError('영문 브랜드명을 입력해주세요. 가이드 내지 헤더에 필수로 사용됩니다.');
      return;
    }
    if (!project.logo) {
      setError('SVG 형식의 로고 파일을 업로드해 주세요. AI 파일은 Illustrator에서 SVG로 저장하면 됩니다.');
      return;
    }
    setError('');
    setEnabled(previous=>Object.fromEntries(pages.map(page=>[page.id,previous[page.id]!==false])));
    setCurrentId(pages[0].id);
    setMode('editor');
    window.location.hash = '/editor';
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (!hydrated && (mode==='setup' || mode==='editor')) return <div className="bramer-loading-project" role="status">저장된 프로젝트 확인 중...</div>;
  // This client-side guard prevents accidental pre-registration workspace access.
  // Browser-session access is not a substitute for backend authorization.
  if (!hasBetaSession() && ['dashboard','setup','editor','projects'].includes(mode)) {
    return <TechnicalManifesto onHome={goHome} onBeta={enterBetaFromManifesto}/>;
  }
  if (mode === 'manifesto') return <TechnicalManifesto onHome={goHome} onBeta={enterBetaFromManifesto}/>;
  if (mode === 'projects') return <ProjectLibrary projects={savedProjects}
    onOpen={id=>void resumeSavedProject(id)} onRemove={id=>void removeSavedProject(id)}
    onNew={()=>void createNewProject()} onBack={goHome} onGuide={openGuide} onHelp={openHelp}
    error={libraryError}/>;
  if (mode === 'help') return <HelpView onHome={goHome} onProjects={()=>void openProjectLibrary()}
    onGuide={openGuide} onNew={()=>void createNewProject()} onHelp={openHelp}/>;
  if (mode === 'landing') return <Landing onStart={enterWorkspace} onManifesto={openManifesto} />;
  if (mode === 'welcome') return <WelcomeExperience onFinish={finishWelcome} english={welcomeLanguage==='en'}/>;
  if (mode === 'dashboard' || mode === 'guide') return <Dashboard
    view={mode}
    onNavigate={navigateWorkspace}
    onHome={goHome}
    onProjects={()=>{if(!hasBetaSession()){enterBetaFromManifesto();return;}void openProjectLibrary();}}
    onHelp={openHelp}
    onCreate={(nextIndustry) => { if(!hasBetaSession()) {enterBetaFromManifesto();return;} openCreate(nextIndustry); }}
    onContinue={() => { window.location.hash = '/create'; setMode('setup'); }}
    onImport={event => void restoreProject(event)}
    currentProject={project.name.trim() || undefined}
    currentIndustry={industry}
    firstUseCoach={mode==='dashboard' && showFirstCoach}
    onDismissCoach={()=>setShowFirstCoach(false)}
  />;

  if (mode === 'setup') {
    return (
      <div className="bramer-dash bramer-create-shell setup-mode">
        <header className="bramer-dash-header">
          <button type="button" className="bramer-dash-logo" onClick={goHome} aria-label="Bramer 서비스 소개로 이동"><BramerLogo /></button>
          <span className="bramer-dash-product">브랜드 가이드라인 제작 <span className="bramer-save-state">{saveStatus === 'saving' ? '· 저장 중' : saveStatus === 'saved' ? '· 브라우저에 저장됨' : saveStatus === 'error' ? '· 저장 실패' : ''}</span></span>
          <div className="bramer-create-header-actions">
            <label className="bramer-create-import">프로젝트 불러오기<input type="file" accept=".json,application/json" onChange={event => void restoreProject(event)} /></label>
            <button type="button" className="bramer-dash-header-start" onClick={() => void saveToBrowser()}>브라우저 저장</button>
          </div>
        </header>
        <div className="bramer-dash-layout">
          <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
            <WorkspaceNav active="create" onHome={goHome} onProjects={()=>void openProjectLibrary()} onGuide={openGuide} onHelp={openHelp} onNew={()=>void createNewProject()}/>
            <div className="bramer-dash-sidebar-bottom">
              <p>브랜드 정보와 로고를 등록하고, 필요한 규칙을 선택하여 가이드라인을 만들어보세요.</p>
              <button type="button" onClick={openHelp}>사용 방법 보기</button>
            </div>
          </aside>
          <main className="bramer-dash-content bramer-create-content">
        <div className="setup-workspace">
          <nav className="setup-step-nav" aria-label="Project setup steps">
            <div className="step-nav-head">
              <span className="metadata-label">PROJECT SETUP</span>
              <strong>브랜드 시스템 설정</strong>
              <p>로고를 올리고, 필요한 브랜드 규칙을 직접 선택하세요. 브레이머가 가이드라인의 기본 구조를 구성합니다.</p>
            </div>
            <div className="step-nav-list">
              {([
                [1, '브랜드 정보', '브랜드 입력'],
                [2, '기본 구성', '17개 항목'],
                [3, '로고 업로드', 'SVG 분석'],
                [4, '컬러 · 서체', '스타일 설정'],
                [5, '응용 정보 · 검토', '명함·스티커 등'],
              ] as const).map(([step, label, detail]) => (
                <button
                  key={step}
                  type="button"
                  className={`step-nav-item ${setupStep === step ? 'active' : ''}`}
                  onClick={() => setSetupStep(step)}
                >
                  <span className="step-nav-number">{String(step).padStart(2, '0')}</span>
                  <span className="step-nav-copy">
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <i className={stepStatus[step] ? 'complete' : ''}>{stepStatus[step] ? '✓' : ''}</i>
                </button>
              ))}
            </div>
            <div className="step-nav-progress">
              <div>
                <span>Readiness</span>
                <strong>{setupProgress}%</strong>
              </div>
              <div className="progress-track"><i style={{ width: `${setupProgress}%` }} /></div>
            </div>
          </nav>

          <section className="setup-main">
            <div className="bramer-workspace-heading">
              <div><span className="bramer-workspace-kicker">가이드라인 제작</span>
                <h1>{project.name.trim() ? `${project.name.trim()} 브랜드 가이드라인 만들기` : '새 브랜드 가이드라인 만들기'}</h1>
                <p>브랜드 정보를 입력하고 필요한 규칙을 선택해 주세요. 단계별로 가이드라인을 완성할 수 있어요.</p>
              </div>
              <div className="bramer-workspace-meta"><span>WORKSPACE</span><strong>{String(setupStep).padStart(2, '0')} / 05</strong></div>
            </div>
            <div className="setup-module-stack">
              <section className={`setup-module setup-panel ${setupStep === 1 ? 'active' : ''}`}>
                <div className="module-index">01</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">01 / BRAND FOUNDATION</span>
                      <h2>어떤 브랜드를 만들고 있나요?</h2>
                      <p className="module-description">브랜드의 정보를 입력하고 업종에 따라 필요한 가이드라인 항목을 선택하세요.</p>
                    </div>
                    <span className="module-state">{project.name && project.englishName ? 'Complete' : 'Required'}</span>
                  </div>
                  <div className="field-grid two-column">
                    <label className="field">
                      <span>브랜드명 *</span>
                      <input value={project.name} onChange={(e) => updateProject('name', e.target.value)} placeholder="브랜드명" />
                    </label>
                    <label className="field">
                      <span>영문 브랜드명 *</span>
                      <input value={project.englishName} onChange={(e) => updateProject('englishName', e.target.value)} placeholder="Brand name" required />
                    </label>
                  </div>
                  <label className="field">
                    <span>브랜드 설명</span>
                    <textarea value={project.description} onChange={(e) => updateProject('description', e.target.value)} placeholder="브랜드의 성격, 가치, 인상을 2~5줄 정도 입력해주세요." />
                  </label>
                  <div className="field-grid two-column">
                    <label className="field">
                      <span>슬로건</span>
                      <input value={project.slogan} onChange={(e) => updateProject('slogan', e.target.value)} placeholder="선택 입력" />
                    </label>
                    <label className="field">
                      <span>제작 연도</span>
                      <input value={project.year} onChange={(e) => updateProject('year', e.target.value)} />
                    </label>
                  </div>
                </div>
              </section>

              <section className={`setup-module setup-panel ${setupStep === 2 ? 'active' : ''}`}>
                <div className="module-index">02</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">INDUSTRY GUIDELINES</span>
                      <h2>17개 브랜드 가이드라인 항목</h2>
                      <p className="module-description">로고·컬러·서체·브랜드 정보·응용 디자인을 기본 구성으로 제작합니다.</p>
                    </div>
                    <span className="module-state">선택 가능</span>
                  </div>
                  <div className="field bramer-industry-picker">
                    <span>어떤 업종의 브랜드인가요?</span>
                    <BramerSelect value={industry} onChange={value => changeIndustry(value as IndustryId)} ariaLabel="브랜드 업종 선택" options={INDUSTRIES.map(item => ({ value: item.id, label: item.label }))}/>
                    <p className="module-description bramer-research-note">업종 정보는 가이드 참고 자료로 사용됩니다. 기본 17개 항목은 동일하게 제작됩니다.</p>
                  <div className="bramer-industry-focus">
                    <strong>이 업종에서는 이런 기준이 중요해요.</strong>
                    <p>{INDUSTRY_RATIONALE[industry].why}</p>
                    <div>{INDUSTRY_GUIDANCE[industry].touchpoints.map(point => <span key={point}>{point}</span>)}</div>
                  </div>
                    <div className="bramer-v2-guideline-head"><strong>17개 기본 제작 항목</strong><span>총 5개 시스템 · 디자인 응용 4종 포함</span></div>
                    <div className="bramer-v2-guideline-grid">
                      {CORE_ITEMS.map(([name, description], index) => (
                        <div className="bramer-v2-guideline-item" key={name}>
                          <span>{String(index+1).padStart(2,'0')}</span>
                          <div><strong>{name}</strong><small>{description}</small></div>
                          <span className="bramer-v2-check">✓</span>
                        </div>
                      ))}
                    </div>
                    <p className="module-description">기본 17개 항목은 모두 제작 문서에 포함됩니다. 명함·봉투 등에 필요한 연락처 정보는 마지막 단계에서 입력해 주세요. 로고 최소 크기와 인쇄 규격은 제작 전 검토가 필요합니다.</p>
                  </div>
                  </div>
              </section>

              <section className={`setup-module setup-panel ${setupStep === 3 ? 'active' : ''}`}>
                <div className="module-index">03</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">PRIMARY ASSET</span>
                      <h2>로고 업로드</h2>
                      <p className="module-description">일러스트레이터 AI 파일도 SVG 형식으로 저장하면 사용할 수 있어요. SVG 로고의 비율과 컬러를 분석해 기본 규칙을 제안합니다.</p>
                    </div>
                    <span className="module-state">{project.logo ? 'Detected' : 'Required'}</span>
                  </div>
                  <div className="bramer-svg-requirement" role="note">
                    <strong>업로드 가능: SVG 파일만</strong>
                    <p><strong>AI 파일은 직접 업로드할 수 없습니다.</strong> Adobe Illustrator에서 AI 파일을 연 뒤, <b>파일 → 다른 이름으로 저장 → SVG</b>로 저장하고 업로드해 주세요.</p>
                  </div>
                  <label className={`upload-zone creator-upload ${project.logo ? 'has-file' : ''}`}>
                    <input type="file" accept=".svg,image/svg+xml" onChange={handleLogo} />
                    <span className="upload-icon">{project.logo ? '✓' : '+'}</span>
                    <strong>{project.logo ? project.logo.fileName : 'SVG 로고 파일 업로드'}</strong>
                    <span>{project.logo ? `Ratio ${project.logo.aspectRatio.toFixed(2)} : 1 · ${project.logo.colors.length} colors detected` : 'SVG 로고 파일을 선택해 주세요. AI 원본은 Illustrator에서 SVG로 저장한 뒤 업로드해야 합니다.'}</span>
                    <em>{project.logo ? '파일 변경' : '파일 선택'}</em>
                  </label>
                  <details className="bramer-svg-help">
                    <summary>AI(일러스트레이터) 파일만 가지고 있나요?</summary>
                    <div className="bramer-svg-help-content">
                      <p>SVG는 로고의 선과 형태를 유지하는 벡터 파일이에요. Illustrator에서 AI 파일을 SVG로 저장하면 Bramer에 사용할 수 있습니다.</p>
                      <ol>
                        <li>Adobe Illustrator에서 로고 AI 파일을 엽니다.</li>
                        <li><strong>파일 → 다른 이름으로 저장</strong>을 선택합니다.</li>
                        <li>파일 형식에서 <strong>SVG (*.SVG)</strong>를 선택하고 저장합니다.</li>
                        <li>저장한 SVG 파일을 위 업로드 영역에 올립니다.</li>
                      </ol>
                      <p>로고의 글자가 다른 컴퓨터에서 달라 보이지 않게 하려면, 필요할 때 글꼴을 윤곽선으로 변환한 복사본을 저장하세요. 원본 AI 파일은 따로 보관하는 것을 권장합니다.</p>
                    </div>
                  </details>
                  {project.logo ? (
                    <div className="svg-analysis">
                      <div className="analysis-heading">
                        <div>
                          <span className="metadata-label">SVG ANALYSIS · V1</span>
                          <strong>로고 구조 분석</strong>
                        </div>
                        <span className="analysis-confidence">
                          {Math.round(project.logo.analysis.classification.confidence * 100)}% confidence
                        </span>
                      </div>

                      <div className="analysis-summary-grid">
                        <div className="analysis-primary-card">
                          <span>DETECTED TYPE</span>
                          <strong>{project.logo.analysis.classification.type.replace('-', ' ').toUpperCase()}</strong>
                          <small>{project.logo.analysis.geometry.orientation.toUpperCase()}</small>
                        </div>
                        <div className="analysis-metric">
                          <span>VISUAL RATIO</span>
                          <strong>{project.logo.analysis.geometry.visualAspectRatio.toFixed(2)} : 1</strong>
                          <small>{Math.round(project.logo.analysis.geometry.canvasOccupancy * 100)}% canvas occupancy</small>
                        </div>
                        <div className="analysis-metric">
                          <span>COMPLEXITY</span>
                          <strong>{project.logo.analysis.structure.complexity.replace('-', ' ').toUpperCase()}</strong>
                          <small>{project.logo.analysis.structure.complexityScore} / 100</small>
                        </div>
                        <div className="analysis-metric">
                          <span>STRUCTURE</span>
                          <strong>{project.logo.analysis.structure.pathCount} paths</strong>
                          <small>{project.logo.analysis.structure.elementCount} elements · {project.logo.analysis.structure.groupCount} groups</small>
                        </div>
                      </div>

                      <div className="analysis-detail-row">
                        <div>
                          <span>Fine detail density</span>
                          <strong>{Math.round(project.logo.analysis.structure.smallDetailRatio * 100)}%</strong>
                        </div>
                        <div>
                          <span>Path commands</span>
                          <strong>{project.logo.analysis.structure.commandCount}</strong>
                        </div>
                        <div>
                          <span>Orientation</span>
                          <strong>{project.logo.analysis.geometry.orientation}</strong>
                        </div>
                      </div>

                      <div className="analysis-color-section">
                        <div className="inline-label-row">
                          <span className="metadata-label">COLOR ANALYSIS</span>
                          <small>SVG 속성 사용 빈도를 기준으로 계산합니다.</small>
                        </div>
                        <div className="analysis-color-list">
                          {project.logo.analysis.color.colors.length ? project.logo.analysis.color.colors.slice(0, 6).map((item, index) => (
                            <button
                              className="analysis-color-item"
                              key={item.hex}
                              type="button"
                              onClick={() => setProject((previous) => ({ ...previous, colors: { ...previous.colors, primary: item.hex } }))}
                            >
                              <i style={{ background: item.hex }} />
                              <span>
                                <strong>{String(index + 1).padStart(2, '0')} · {item.hex}</strong>
                                <small>{Math.round(item.usageRatio * 100)}% usage</small>
                              </span>
                            </button>
                          )) : <p className="analysis-empty">명시적인 Fill / Stroke 컬러가 감지되지 않았습니다.</p>}
                        </div>
                      </div>

                      <div className="analysis-recommendation">
                        <div className="analysis-recommendation-head">
                          <div>
                            <span className="metadata-label">RECOMMENDED RULES</span>
                            <strong>분석값 기반 자동 제안</strong>
                          </div>
                          <button
                            className={`button small ${recommendationsApplied ? 'secondary' : 'primary'}`}
                            type="button"
                            onClick={applyLogoRecommendations}
                          >
                            {recommendationsApplied ? 'Applied' : 'Apply recommendations'}
                          </button>
                        </div>
                        <div className="recommendation-grid">
                          <div>
                            <span>CLEAR SPACE</span>
                            <strong>{project.logo.analysis.recommendation.clearSpace.toFixed(2)}X</strong>
                            <small>Logo height basis</small>
                          </div>
                          <div>
                            <span>PRINT MIN.</span>
                            <strong>{project.logo.analysis.recommendation.minimumPrintMm} mm</strong>
                            <small>Recommended lower limit</small>
                          </div>
                          <div>
                            <span>DIGITAL MIN.</span>
                            <strong>{project.logo.analysis.recommendation.minimumDigitalPx} px</strong>
                            <small>Recommended lower limit</small>
                          </div>
                        </div>
                        <div className="recommendation-reasons">
                          {project.logo.analysis.recommendation.rationale.map((reason) => <span key={reason}>{reason}</span>)}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {project.logo?.colors.length ? (
                    <div className="detected-colors legacy-detected-colors" aria-label="SVG에서 감지된 컬러">
                      <div className="inline-label-row">
                        <span className="metadata-label">QUICK COLOR APPLY</span>
                        <small>클릭하면 Primary Color로 적용됩니다.</small>
                      </div>
                      <div className="color-chip-row">
                        {project.logo.colors.map((color) => (
                          <button
                            className="color-chip"
                            key={color}
                            type="button"
                            onClick={() => setProject((previous) => ({ ...previous, colors: { ...previous.colors, primary: color } }))}
                          >
                            <i style={{ background: color }} />
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={`setup-module setup-panel ${setupStep === 4 ? 'active' : ''}`}>
                <div className="module-index">04</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">VISUAL SYSTEM</span>
                      <h2>컬러 & 타이포그래피</h2>
                      <p className="module-description">브랜드 컬러와 서체 체계를 설정하여 문서 전반의 시각적 일관성을 구성합니다.</p>
                    </div>
                    <span className="module-state">System</span>
                  </div>
                  <div className="system-split">
                    <div className="system-block">
                      <div className="system-block-title">
                        <div>
                          <span className="system-index">01</span>
                          <strong>Color System</strong>
                        </div>
                        <span>HEX · RGB · CMYK 자동 변환</span>
                      </div>
                      <div className="field-grid three-column compact-color-grid">
                        {(['primary', 'secondary', 'accent'] as const).map((key) => (
                          <label className="field" key={key}>
                            <span>{key[0].toUpperCase() + key.slice(1)}</span>
                            <div className="color-input refined-color-input">
                              <input
                                className="native-color"
                                type="color"
                                value={isHex(project.colors[key]) ? project.colors[key] : '#111111'}
                                onChange={(e) => setProject((previous) => ({ ...previous, colors: { ...previous.colors, [key]: e.target.value.toUpperCase() } }))}
                              />
                              <input
                                value={project.colors[key]}
                                onChange={(e) => setProject((previous) => ({ ...previous, colors: { ...previous.colors, [key]: e.target.value } }))}
                                aria-label={`${key} color hex`}
                              />
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="system-block">
                      <div className="system-block-title">
                        <div>
                          <span className="system-index">02</span>
                          <strong>Typography System</strong>
                        </div>
                        <span>Title / Body typeface</span>
                      </div>
                      <div className="field-grid two-column">
                        <div className="field">
                          <span>Title Typeface</span>
                          <BramerSelect value={project.typography.title} onChange={value => setProject(previous => ({ ...previous, typography: { ...previous.typography, title: value } }))} ariaLabel="제목 서체 선택" options={FONT_OPTIONS.map(font => ({ value: font, label: font }))}/>
                        </div>
                        <div className="field">
                          <span>Body Typeface</span>
                          <BramerSelect value={project.typography.body} onChange={value => setProject(previous => ({ ...previous, typography: { ...previous.typography, body: value } }))} ariaLabel="본문 서체 선택" options={FONT_OPTIONS.map(font => ({ value: font, label: font }))}/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={`setup-module setup-panel ${setupStep === 5 ? 'active' : ''}`}>
                <div className="module-index">05</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">LOGO RULES</span>
                      <h2>사용 규정과 응용 디자인 정보</h2>
                      <p className="module-description">로고 사용 규칙과 명함·레터헤드·봉투에 들어갈 내용을 확인하세요. 스티커에는 등록한 로고와 브랜드 컬러가 사용됩니다.</p>
                    </div>
                    <span className="module-state">Editable</span>
                  </div>
                  <div className="rules-grid">
                    <label className="field">
                      <span>Clear Space</span>
                      <div className="suffix-input"><input type="number" min="0.1" max="2" step="0.05" value={project.rules.clearSpace} onChange={(e) => setProject((previous) => ({ ...previous, rules: { ...previous.rules, clearSpace: Number(e.target.value) } }))} /><span>X</span></div>
                    </label>
                    <label className="field">
                      <span>Print Minimum</span>
                      <div className="suffix-input"><input type="number" min="1" value={project.rules.minimumPrintMm} onChange={(e) => setProject((previous) => ({ ...previous, rules: { ...previous.rules, minimumPrintMm: Number(e.target.value) } }))} /><span>mm</span></div>
                    </label>
                    <label className="field">
                      <span>Digital Minimum</span>
                      <div className="suffix-input"><input type="number" min="8" value={project.rules.minimumDigitalPx} onChange={(e) => setProject((previous) => ({ ...previous, rules: { ...previous.rules, minimumDigitalPx: Number(e.target.value) } }))} /><span>px</span></div>
                    </label>
                  </div>
                  <div className="bramer-v2-contact">
                    <div className="module-heading"><div><span className="module-kicker">APPLICATION INFORMATION</span><h3>명함 · 공식 서식에 들어갈 정보</h3><p className="module-description">입력한 내용은 자동저장되고 문서와 명함 시안에 반영됩니다. 미입력 항목은 완성된 정보처럼 임의 생성하지 않습니다.</p></div></div>
                    <div className="field-grid two-column">
                      {([
                        ['personName','성함','홍길동'],['position','직책','대표 / Designer'],
                        ['phone','연락처','010-0000-0000'],['email','이메일','name@example.com'],
                        ['company','회사명','브랜드명과 다를 경우'],['website','웹사이트','www.example.com'],
                        ['address','회사 주소','인쇄물에 표기할 주소'],
                      ] as const).map(([key,label,placeholder])=>(
                        <label className="field" key={key}><span>{label}</span>
                          <input placeholder={placeholder} value={project.contact?.[key] ?? ''}
                            onChange={event=>setProject(prev=>({...prev,contact:{personName:'',position:'',phone:'',email:'',website:'',company:'',address:'',...prev.contact,[key]:event.target.value}}))}/>
                        </label>
                      ))}
                    </div>
                    <div className="bramer-v2-export">
                      <strong>응용 디자인 SVG 원본</strong>
                      <p className="module-description">명함 90×50mm, 스티커 50mm, A4 레터헤드, 소·대봉투 SVG를 개별 다운로드할 수 있습니다. 인쇄 전 도련·폰트·재단·봉투 전개도 등 실측 규격을 반드시 확인하세요.</p>
                      {project.logo && <div className="bramer-v2-export-buttons">
                        <button type="button" onClick={()=>downloadSvg({id:'business-card-front',section:'application',title:'Business Card Front',subtitle:'',svg:generateBusinessCardSvg(project)},project.englishName||project.name)}>명함 앞면 SVG</button>
                        <button type="button" onClick={()=>downloadSvg({id:'business-card-back',section:'application',title:'Business Card Back',subtitle:'',svg:generateBusinessCardSvg(project,true)},project.englishName||project.name)}>명함 뒷면 SVG</button>
                        <button type="button" onClick={()=>downloadSvg({id:'sticker-round',section:'application',title:'Round Sticker',subtitle:'',svg:generateStickerSvg(project,'circle')},project.englishName||project.name)}>원형 스티커 SVG</button>
                        <button type="button" onClick={()=>downloadSvg({id:'sticker-square',section:'application',title:'Square Sticker',subtitle:'',svg:generateStickerSvg(project,'square')},project.englishName||project.name)}>사각 스티커 SVG</button>
                        <button type="button" onClick={()=>downloadSvg({id:'letterhead-a4',section:'application',title:'A4 Letterhead',subtitle:'',svg:generateLetterheadSvg(project)},project.englishName||project.name)}>A4 레터헤드 SVG</button>
                        <button type="button" onClick={()=>downloadSvg({id:'envelope-small',section:'application',title:'Small Envelope',subtitle:'',svg:generateEnvelopeSvg(project,'small')},project.englishName||project.name)}>소봉투 SVG</button>
                        <button type="button" onClick={()=>downloadSvg({id:'envelope-large',section:'application',title:'Large Envelope',subtitle:'',svg:generateEnvelopeSvg(project,'large')},project.englishName||project.name)}>대봉투 SVG</button>
                      </div>}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {error ? <p className="error-message setup-error" role="alert">{error}</p> : null}

            <div className="setup-actions creator-actions step-actions">
              <div className="action-copy">
                <span className="action-step">STEP {String(setupStep).padStart(2, '0')} / 05</span>
                <strong>{setupStep === 1 ? '브랜드의 기본 정보를 입력하세요.' : setupStep === 2 ? `${industryLabel} · 기본 ${selectedCount}개 항목` : setupStep === 3 ? '로고를 업로드하고 권장 규칙을 확인하세요.' : setupStep === 4 ? '컬러와 서체를 설정하세요.' : '최종 사용 규칙을 확인하고 문서를 생성하세요.'}</strong>
                <span>{pages.length} pages · A4 Landscape · Editable SVG · PDF Export</span>
              </div>
              <div className="step-action-buttons">
                {setupStep > 1 ? (
                  <button className="button secondary step-back" type="button" onClick={() => setSetupStep((setupStep - 1) as 1 | 2 | 3 | 4 | 5)}>
                    이전
                  </button>
                ) : null}
                {setupStep < 5 ? (
                  <button className="button primary creator-primary" type="button" onClick={() => setSetupStep((setupStep + 1) as 1 | 2 | 3 | 4 | 5)}>
                    다음 단계
                    <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button className="button primary creator-primary" type="button" onClick={generate}>
                    가이드라인 생성
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className={`setup-preview-panel ${setupStep !== 5 ? 'bramer-preview-hidden' : ''}`}>
            <div className="preview-sticky">
              <div className="preview-panel-heading">
                <div>
                  <span className="metadata-label">LIVE PREVIEW · BRAMER STUDIO</span>
                  <strong>{project.englishName || 'YOUR BRAND'}</strong>
                </div>
                <span className="preview-format">A4 · 297×210</span>
              </div>

              <div className="creator-document-preview" style={{ background: isHex(project.colors.primary) ? project.colors.primary : '#111111' }}>
                <div className="document-topline">
                  <span>BRAND GUIDELINES</span>
                  <span>{project.year}</span>
                </div>
                <div className="document-hero-title">Brand<br />Guidelines</div>
                <div className="document-logo-preview">
                  {project.logo ? <div dangerouslySetInnerHTML={{ __html: project.logo.raw }} /> : <span>LOGO</span>}
                </div>
                <div className="document-footer-preview">
                  <span>{project.englishName || 'Brand Name'}</span>
                  <span>{project.slogan || 'Visual Identity System'}</span>
                </div>
              </div>

              <div className="preview-system-grid">
                <div className="preview-stat">
                  <span>PAGES</span>
                  <strong>{pages.length}</strong>
                  <small>Auto generated</small>
                </div>
                <div className="preview-stat">
                  <span>FORMAT</span>
                  <strong>SVG</strong>
                  <small>Vector editable</small>
                </div>
                <div className="preview-stat">
                  <span>OUTPUT</span>
                  <strong>PDF</strong>
                  <small>A4 Landscape</small>
                </div>
              </div>

              <div className="preview-progress-card">
                <div className="progress-label">
                  <span>Project readiness</span>
                  <strong>{setupProgress}%</strong>
                </div>
                <div className="progress-track"><i style={{ width: `${setupProgress}%` }} /></div>
                <p>필수 설정이 완료되면 가이드라인 문서를 생성할 수 있습니다.</p>
              </div>

              <div className="bramer-onboarding-note"><span>GUIDELINE WORKSPACE</span><strong>로고 하나에서 시작하는 브랜드 시스템.</strong><p>선택한 구성에 따라 가이드라인의 목차와 결과물이 함께 변경됩니다.</p></div><div className="page-structure-card">
                <div className="page-structure-heading">
                  <div>
                    <span className="metadata-label">YOUR GUIDELINE</span>
                    <strong>가이드라인 구성</strong>
                  </div>
                  <span>{pages.length}P</span>
                </div>
                <div className="page-structure-list">
                  {pages.map((page, index) => (
                    <div className="structure-row" key={page.id}>
                      <span className="structure-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="structure-title">{page.subtitle || page.title}</span>
                      <span className="structure-section">{sectionLabels[page.section]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell editor-mode">
      <header className="topbar editor-topbar">
        <div className="topbar-inner editor-header-inner">
          <div className="product-brand editor-product-brand">
            <span className="product-mark">g.</span>
            <div>
              <button type="button" className="bramer-brand-home" onClick={goHome} aria-label="Bramer 홈으로 이동"><BramerLogo /></button>
              <span className="project-name">{project.englishName} · {enabledPages.length} pages</span>
            </div>
          </div>
          <div className="header-actions"><label className="bramer-doc-language">결과물 언어 <select value={documentLanguage} onChange={event => selectDocumentLanguage(event.target.value as DocumentLanguage)} aria-label="가이드라인 출력 언어"><option value="ko">한국어 KO</option><option value="en">English EN</option></select></label><button className="button ghost" onClick={() => navigateWorkspace('dashboard')}>대시보드</button><span className="bramer-editor-industry">{industryLabel} · {selectedCount} MODULES</span>
            <button className="button ghost" onClick={() => void saveToBrowser()}>브라우저 저장</button>
            <button className="button ghost" onClick={() => void openProjectLibrary()}>내 프로젝트</button>
            <button className="button ghost" onClick={() => { setSetupStep(1); setMode('setup'); window.location.hash = '/create'; }}>구성 변경</button>
            <button className="button secondary" onClick={() => void downloadAllSvg(enabledPages, project.englishName || project.name)}>전체 SVG</button>
            <button className="button primary" onClick={() => window.print()}>PDF로 내보내기</button>
          </div>
        </div>
      </header>

      <div className="bramer-editor-overview">
        <div><span>가이드라인 편집</span><h1>{project.englishName || project.name}</h1></div>
        <div><strong>{enabledPages.length}개 페이지</strong><small>{industryLabel} · A4 Landscape</small></div>
      </div>
      <main className="editor-layout">
        <aside className="page-sidebar" aria-label="가이드라인 목차">
          <div className="bramer-editor-global-menu">
            <WorkspaceNav active="create" onHome={goHome} onProjects={()=>void openProjectLibrary()} onGuide={openGuide} onHelp={openHelp} onNew={()=>void createNewProject()}/>
          </div>
          <div className="sidebar-heading">
            <strong>CONTENTS</strong>
            <span>{enabledPages.length}/{pages.length}</span>
          </div>
          <div className="page-list grouped-page-list">
            {(['intro', 'logo', 'color', 'typography', 'graphic', 'photography', 'verbal', 'application', 'end'] as GuidelinePage['section'][]).map((section) => {
              const groupPages = pages.filter((page) => page.section === section);
              if (!groupPages.length) return null;
              return (
                <div className="page-group" key={section}>
                  <div className="page-group-label">
                    <span>{sectionLabels[section]}</span>
                    <i>{groupPages.length}</i>
                  </div>
                  {groupPages.map((page) => {
                    const index = pages.findIndex((item) => item.id === page.id);
                    return (
                      <div className={`page-row ${page.id === currentPage.id ? 'selected' : ''}`} key={page.id}>
                        <button className="page-select" onClick={() => setCurrentId(page.id)}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <span>{page.subtitle || page.title}</span>
                        </button>
                        <input
                          type="checkbox"
                          checked={enabled[page.id] !== false}
                          onChange={(event) => setEnabled((previous) => ({ ...previous, [page.id]: event.target.checked }))}
                          aria-label={`${page.title} 페이지 사용`}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="preview-area">
          <div className="preview-toolbar creator-preview-toolbar">
            <div className="preview-title-block">
              <span className="metadata-label">{currentPage.title}</span>
              <strong>{currentPage.subtitle || currentPage.title}</strong>
            </div>
            <div className="preview-toolbar-meta">
              <span>{String(currentPageNumber).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</span>
              <span>A4 가로형</span>
              <span>벡터 문서</span>
              <button className="button tertiary small" onClick={() => downloadSvg(currentPage, project.englishName || project.name)}>SVG 다운로드</button>
            </div>
          </div>
          <div className="page-stage">
            <div className="svg-page" dangerouslySetInnerHTML={{ __html: currentPage.svg }} />
          </div>
        </section>

        <aside className="settings-panel">
          <div className="settings-heading">
            <p className="eyebrow">페이지 설정</p>
            <h2>{currentPage.subtitle || currentPage.title}</h2>
          </div>

          <div className="setting-group">
            <label className="field compact">
              <span>브랜드 설명</span>
              <textarea value={project.description} onChange={(e) => updateProject('description', e.target.value)} />
            </label>
          </div>

          <div className="setting-group">
            <h3>로고 사용 규정</h3>
            <label className="field compact">
              <span>Clear Space</span>
              <div className="suffix-input"><input type="number" min="0.1" max="2" step="0.05" value={project.rules.clearSpace} onChange={(e) => setProject((previous) => ({ ...previous, rules: { ...previous.rules, clearSpace: Number(e.target.value) } }))} /><span>X</span></div>
            </label>
            <div className="field-grid two-column">
              <label className="field compact">
                <span>Print minimum</span>
                <div className="suffix-input"><input type="number" min="1" value={project.rules.minimumPrintMm} onChange={(e) => setProject((previous) => ({ ...previous, rules: { ...previous.rules, minimumPrintMm: Number(e.target.value) } }))} /><span>mm</span></div>
              </label>
              <label className="field compact">
                <span>Digital minimum</span>
                <div className="suffix-input"><input type="number" min="8" value={project.rules.minimumDigitalPx} onChange={(e) => setProject((previous) => ({ ...previous, rules: { ...previous.rules, minimumDigitalPx: Number(e.target.value) } }))} /><span>px</span></div>
              </label>
            </div>
          </div>


          <div className="setting-group">
            <label className="field compact"><span>슬로건 · 브랜드 메시지</span><textarea value={project.slogan} onChange={e=>updateProject('slogan',e.target.value)} /></label>
            <h3>문서 정보</h3>
            <div className="spec-row"><span>Artboard</span><strong>A4 Landscape</strong></div>
            <div className="spec-row"><span>Size</span><strong>297 × 210 mm</strong></div>
            <div className="spec-row"><span>Tracking</span><strong>-3%</strong></div>
            <div className="spec-row"><span>Rendering</span><strong>SVG Vector</strong></div>
          </div>
        </aside>
      </main>

      <div className="print-pages" aria-hidden="true">
        {enabledPages.map((page) => <div className="print-page" key={page.id} dangerouslySetInnerHTML={{ __html: page.svg }} />)}
      </div>
    </div>
  );
}
