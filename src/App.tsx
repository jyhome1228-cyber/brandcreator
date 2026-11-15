import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { parseLogoSvg } from './engines/svgParser';
import Landing from './Landing';
import Dashboard from './Dashboard';
import { downloadAllSvg, downloadSvg } from './export/download';
import { generateGuidelinePages } from './guideline-system/generatePages';
import { generateExtensionPages } from './guideline-system/extensionPages';
import { CATEGORIES, INDUSTRIES, INDUSTRY_GUIDANCE, getDefaultSelection, getRecommendations, type GuidelineCategory, type IndustryId } from './engines/industryRecommendations';
import { postProcessGuidelinePages } from './guideline-system/postProcess';
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
  const [mode, setMode] = useState<'landing' | 'dashboard' | 'guide' | 'setup' | 'editor'>(() => location.hash === '#/create' || location.hash === '#/editor' ? 'setup' : location.hash === '#/dashboard' ? 'dashboard' : location.hash === '#/guide' ? 'guide' : 'landing');
  const enterWorkspace = () => {
    window.location.hash = '/dashboard';
    setMode('dashboard');
    window.scrollTo({ top: 0, behavior: 'instant' });
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
    window.location.hash = view === 'guide' ? '/guide' : '/dashboard';
    setMode(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const goHome = () => {
    window.location.hash = '/';
    setMode('landing');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => {
    const syncRoute = () => {
      if (window.location.hash === '#/dashboard') setMode('dashboard');
      else if (window.location.hash === '#/guide') setMode('guide');
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
  const recommendations = useMemo(() => getRecommendations(industry), [industry]);
  const pages = useMemo(() => {
    const originals = postProcessGuidelinePages(generateGuidelinePages(project), project);
    const basics = originals.filter(page =>
      page.section === 'end' ||
      (page.section === 'intro' ? (selectedCategories.includes('overview') || page.id === '01-cover' || page.id === '02-index') :
      selectedCategories.includes(page.section as GuidelineCategory))
    );
    const extensions = generateExtensionPages(project, selectedCategories);
    const endPosition = basics.findIndex(page => page.section === 'end');
    if (endPosition < 0) return [...basics, ...extensions];
    return [...basics.slice(0, endPosition), ...extensions, ...basics.slice(endPosition)];
  }, [project, selectedCategories]);
  const changeIndustry = (value: IndustryId) => {
    setIndustry(value);
    setSelectedCategories(getDefaultSelection(value));
  };
  const toggleCategory = (value: GuidelineCategory) => {
    setSelectedCategories(previous => previous.includes(value)
      ? previous.filter(item => item !== value)
      : CATEGORIES.filter(item => item.id === value || previous.includes(item.id)).map(item => item.id));
  };
  const currentPage = pages.find((page) => page.id === currentId) ?? pages[0];
  const currentPageNumber = Math.max(1, pages.findIndex(page => page.id === currentPage?.id) + 1);
  const enabledPages = pages.filter((page) => enabled[page.id] !== false);
  const industryLabel = INDUSTRIES.find(item => item.id === industry)?.label ?? '브랜드';
  const selectedCount = selectedCategories.length;
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

  const saveProject = () => {
    const snapshot = {
      version: 1,
      product: 'bramer',
      industry,
      selectedCategories,
      project,
      enabled,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bramer-${(project.englishName || project.name || 'project').replace(/[^a-z0-9가-힣_-]/gi, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
      setError('Primary Logo SVG를 업로드해주세요.');
      return;
    }
    if (selectedCategories.length === 0) {
      setError('가이드라인에 포함할 구성요소를 하나 이상 선택해주세요.');
      setSetupStep(2);
      return;
    }
    setError('');
    setEnabled(Object.fromEntries(pages.map((page) => [page.id, true])));
    setCurrentId(pages[0].id);
    setMode('editor');
    window.location.hash = '/editor';
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (mode === 'landing') return <Landing onStart={enterWorkspace} />;
  if (mode === 'dashboard' || mode === 'guide') return <Dashboard
    view={mode}
    onNavigate={navigateWorkspace}
    onHome={goHome}
    onCreate={openCreate}
    onContinue={() => { window.location.hash = '/create'; setMode('setup'); }}
    onImport={event => void restoreProject(event)}
    currentProject={project.name.trim() || undefined}
    currentIndustry={industry}
  />;

  if (mode === 'setup') {
    return (
      <div className="bramer-dash bramer-create-shell setup-mode">
        <header className="bramer-dash-header">
          <button type="button" className="bramer-dash-logo" onClick={goHome} aria-label="Bramer 서비스 소개로 이동">Bramer.</button>
          <span className="bramer-dash-product">브랜드 가이드라인 제작</span>
          <button type="button" className="bramer-dash-header-start" onClick={saveProject}>프로젝트 저장</button>
        </header>
        <div className="bramer-dash-layout">
          <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
            <div className="bramer-dash-nav">
              <button type="button" onClick={() => navigateWorkspace('dashboard')}>홈</button>
              <button type="button" onClick={() => navigateWorkspace('guide')}>업종별 가이드</button>
              <button type="button" className="active" aria-current="page" onClick={() => setSetupStep(1)}>새로 만들기</button>
            </div>
            <div className="bramer-dash-sidebar-bottom">
              <p>브랜드 정보와 로고를 등록하고, 필요한 규칙을 선택하여 가이드라인을 만들어보세요.</p>
              <button type="button" onClick={() => navigateWorkspace('dashboard')}>대시보드로 돌아가기</button>
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
                [2, '업종별 구성', '항목 추천'],
                [3, '로고 업로드', 'SVG 분석'],
                [4, '컬러 · 서체', '스타일 설정'],
                [5, '사용 규정', '가이드라인 제작'],
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
                <h1>새 브랜드 가이드라인 만들기</h1>
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
                      <h2>우리 브랜드에 필요한 항목을 골라보세요.</h2>
                      <p className="module-description">업종을 선택하면 가이드라인 구성요소를 추천해 드려요. 필요한 항목은 자유롭게 조정할 수 있어요.</p>
                    </div>
                    <span className="module-state">선택 가능</span>
                  </div>
                  <div className="field bramer-industry-picker">
                    <span>어떤 업종의 브랜드인가요?</span>
                    <select value={industry} onChange={(event) => changeIndustry(event.target.value as IndustryId)} aria-label="브랜드 업종 선택" style={{ width: '100%', marginTop: 10 }}>
                      {INDUSTRIES.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
                    </select>
                    <p className="module-description bramer-research-note">선택한 업종에 따라 추천 항목이 달라집니다. 원하는 항목은 직접 추가하거나 제외할 수 있어요.</p>
                  <div className="bramer-industry-focus">
                    <strong>이 업종에서는 이런 기준이 중요해요.</strong>
                    <p>{INDUSTRY_GUIDANCE[industry].focus}</p>
                    <div>{INDUSTRY_GUIDANCE[industry].touchpoints.map(point => <span key={point}>{point}</span>)}</div>
                  </div>
                    <div className="bramer-module-grid">
                      {CATEGORIES.map(item => (
                        <label key={item.id} className={`bramer-module-card ${selectedCategories.includes(item.id) ? 'is-selected' : ''}`}>
                          <span className="bramer-module-card-top">
                            <input type="checkbox" checked={selectedCategories.includes(item.id)} onChange={() => toggleCategory(item.id)} aria-label={item.label + ' 선택'} />
                            <small className={`bramer-tier bramer-tier-${recommendations[item.id].toLowerCase()}`}>{recommendations[item.id]}</small>
                          </span>
                          <strong className="bramer-module-title">{item.label}</strong>
                          <small className="bramer-module-description">{item.description}</small>
                        </label>
                      ))}
                    </div>
                    <div className="bramer-selection-summary"><strong>{selectedCount} / 8개 항목 선택</strong><span>선택 결과는 실제 생성 페이지와 SVG·PDF 출력에 반영됩니다.</span><button type="button" onClick={() => setSelectedCategories(getDefaultSelection(industry))}>추천 항목으로 초기화</button></div>
                  </div>
                  <p className="bramer-research-note">업종별 추천 기준은 연구 검증 전의 초기 설정값입니다. 22개 브랜드 분석 결과에 따라 보완할 예정입니다.</p>
                </div>
              </section>

              <section className={`setup-module setup-panel ${setupStep === 3 ? 'active' : ''}`}>
                <div className="module-index">03</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">PRIMARY ASSET</span>
                      <h2>로고 업로드</h2>
                      <p className="module-description">Primary Logo SVG를 업로드하면 구조와 컬러를 분석해 사용 규칙을 제안합니다.</p>
                    </div>
                    <span className="module-state">{project.logo ? 'Detected' : 'Required'}</span>
                  </div>
                  <label className={`upload-zone creator-upload ${project.logo ? 'has-file' : ''}`}>
                    <input type="file" accept=".svg,image/svg+xml" onChange={handleLogo} />
                    <span className="upload-icon">{project.logo ? '✓' : '+'}</span>
                    <strong>{project.logo ? project.logo.fileName : 'Primary Logo SVG'}</strong>
                    <span>{project.logo ? `Ratio ${project.logo.aspectRatio.toFixed(2)} : 1 · ${project.logo.colors.length} colors detected` : 'SVG 파일을 올리면 컬러와 비율을 자동 분석합니다.'}</span>
                    <em>{project.logo ? '파일 변경' : '파일 선택'}</em>
                  </label>
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
                        <label className="field">
                          <span>Title Typeface</span>
                          <select value={project.typography.title} onChange={(e) => setProject((previous) => ({ ...previous, typography: { ...previous.typography, title: e.target.value } }))}>
                            {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                          </select>
                        </label>
                        <label className="field">
                          <span>Body Typeface</span>
                          <select value={project.typography.body} onChange={(e) => setProject((previous) => ({ ...previous, typography: { ...previous.typography, body: e.target.value } }))}>
                            {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                          </select>
                        </label>
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
                      <h2>기본 사용 규정</h2>
                      <p className="module-description">로고 보호공간과 최소 사용 크기를 최종 규칙으로 설정합니다.</p>
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
                </div>
              </section>
            </div>

            {error ? <p className="error-message setup-error" role="alert">{error}</p> : null}

            <div className="setup-actions creator-actions step-actions">
              <div className="action-copy">
                <span className="action-step">STEP {String(setupStep).padStart(2, '0')} / 05</span>
                <strong>{setupStep === 1 ? '브랜드의 기본 정보를 입력하세요.' : setupStep === 2 ? `${industryLabel} · ${selectedCount}개 항목 선택` : setupStep === 3 ? '로고를 업로드하고 권장 규칙을 확인하세요.' : setupStep === 4 ? '컬러와 서체를 설정하세요.' : '최종 사용 규칙을 확인하고 문서를 생성하세요.'}</strong>
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

          <aside className={`setup-preview-panel ${setupStep < 3 ? 'bramer-preview-hidden' : ''}`}>
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
              <button type="button" className="bramer-brand-home" onClick={goHome} aria-label="Bramer 홈으로 이동">Bramer.</button>
              <span className="project-name">{project.englishName} · {enabledPages.length} pages</span>
            </div>
          </div>
          <div className="header-actions"><button className="button ghost" onClick={() => navigateWorkspace('dashboard')}>대시보드</button><span className="bramer-editor-industry">{industryLabel} · {selectedCount} MODULES</span>
            <button className="button ghost" onClick={saveProject}>프로젝트 저장</button>
            <button className="button ghost" onClick={() => { setSetupStep(1); setMode('setup'); window.location.hash = '/create'; }}>구성 변경</button>
            <button className="button secondary" onClick={() => void downloadAllSvg(enabledPages, project.englishName || project.name)}>전체 SVG</button>
            <button className="button primary" onClick={() => window.print()}>PDF로 내보내기</button>
          </div>
        </div>
      </header>

      <div className="bramer-editor-overview">
        <div><span>BRAMER / GUIDELINE EDITOR</span><h1>{project.englishName || project.name}</h1></div>
        <div><strong>{enabledPages.length} PAGES</strong><small>{industryLabel} · A4 Landscape</small></div>
      </div>
      <main className="editor-layout">
        <aside className="page-sidebar" aria-label="가이드라인 목차">
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
              <strong>{currentPage.subtitle || currentPage.id}</strong>
            </div>
            <div className="preview-toolbar-meta">
              <span>{String(currentPageNumber).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</span>
              <span>A4 Landscape</span>
              <span>SVG Vector</span>
              <button className="button tertiary small" onClick={() => downloadSvg(currentPage, project.englishName || project.name)}>SVG 다운로드</button>
            </div>
          </div>
          <div className="page-stage">
            <div className="svg-page" dangerouslySetInnerHTML={{ __html: currentPage.svg }} />
          </div>
        </section>

        <aside className="settings-panel">
          <div className="settings-heading">
            <p className="eyebrow">PAGE SETTINGS</p>
            <h2>{currentPage.subtitle || currentPage.title}</h2>
          </div>

          <div className="setting-group">
            <label className="field compact">
              <span>브랜드 설명</span>
              <textarea value={project.description} onChange={(e) => updateProject('description', e.target.value)} />
            </label>
          </div>

          <div className="setting-group">
            <h3>Logo Rules</h3>
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

          {(['graphic', 'photography', 'verbal', 'application'] as GuidelineCategory[]).includes(currentPage.section as GuidelineCategory) ? (
            <div className="setting-group bramer-extension-settings">
              <h3>브랜드별 가이드라인 작성</h3>
              <p className="bramer-setting-note">각 항목의 실제 브랜드 기준을 작성하세요. 변경 사항은 SVG 미리보기와 출력에 즉시 반영됩니다.</p>
              {({
                graphic: ['그래픽 모티프 및 반복 규칙', '아이콘·일러스트레이션 스타일', '모션 사용 환경과 속도 기준'],
                photography: ['조명·색감·톤앤매너', '구도·배경·피사체 처리', '권장 / 비권장 사진 사례'],
                verbal: ['브랜드 보이스와 문장 어조', '핵심 메시지 및 용어', '금지 표현·문구 사용 예시'],
                application: ['주요 고객 접점과 채널', '디지털·인쇄 매체 적용', '운영 상황별 적용 예시'],
              } as Record<string, string[]>)[currentPage.section].map((question, index) => (
                <label className="field compact" key={question}>
                  <span>{question}</span>
                  <textarea
                    maxLength={315}
                    placeholder="브랜드 기준을 구체적으로 작성해주세요."
                    value={project.extensionContent?.[currentPage.section as 'graphic' | 'photography' | 'verbal' | 'application']?.[index] ?? ''}
                    onChange={(event) => {
                      const group = currentPage.section as 'graphic' | 'photography' | 'verbal' | 'application';
                      setProject(previous => {
                        const lines = [...(previous.extensionContent?.[group] ?? ['', '', ''])];
                        lines[index] = event.target.value;
                        return { ...previous, extensionContent: { ...previous.extensionContent, [group]: lines } };
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}

          <div className="setting-group">
            <h3>Document</h3>
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
