import { useMemo, useState, type ChangeEvent } from 'react';
import { parseLogoSvg } from './engines/svgParser';
import { downloadAllSvg, downloadSvg } from './export/download';
import { generateGuidelinePages } from './guideline-system/generatePages';
import { postProcessGuidelinePages } from './guideline-system/postProcess';
import type { BrandProject } from './types/guideline';

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
  const [mode, setMode] = useState<'setup' | 'editor'>('setup');
  const [currentId, setCurrentId] = useState('01-cover');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const pages = useMemo(() => postProcessGuidelinePages(generateGuidelinePages(project), project), [project]);
  const currentPage = pages.find((page) => page.id === currentId) ?? pages[0];
  const enabledPages = pages.filter((page) => enabled[page.id] !== false);

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
    setError('');
    setEnabled(Object.fromEntries(pages.map((page) => [page.id, true])));
    setCurrentId(pages[0].id);
    setMode('editor');
  };

  if (mode === 'setup') {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <strong className="brand-title">BrandCreator</strong>
            <span className="topbar-meta">Guideline Generator · V1</span>
          </div>
        </header>

        <main className="setup-container">
          <div className="page-heading">
            <p className="eyebrow">CREATE BRAND GUIDELINE</p>
            <h1>브랜드 가이드라인 만들기</h1>
            <p>로고 SVG와 브랜드 기본 정보를 입력하면 LOGO · COLOR · TYPOGRAPHY 중심의 가이드라인을 자동 구성합니다.</p>
          </div>

          <section className="form-section">
            <div className="section-heading">
              <h2>Brand</h2>
              <p>가이드 문서에 사용할 기본 정보를 입력합니다. 영문 브랜드명은 모든 내지 헤더에 사용됩니다.</p>
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
          </section>

          <section className="form-section">
            <div className="section-heading">
              <h2>Logo</h2>
              <p>Primary Logo SVG 한 개만 있으면 기본 가이드 생성이 가능합니다.</p>
            </div>
            <label className={`upload-zone ${project.logo ? 'has-file' : ''}`}>
              <input type="file" accept=".svg,image/svg+xml" onChange={handleLogo} />
              <strong>{project.logo ? project.logo.fileName : 'SVG 파일 업로드'}</strong>
              <span>{project.logo ? `비율 ${project.logo.aspectRatio.toFixed(2)} : 1 · ${project.logo.colors.length}개 컬러 감지` : '파일을 선택하거나 이 영역을 클릭하세요.'}</span>
            </label>
            {project.logo?.colors.length ? (
              <div className="detected-colors" aria-label="SVG에서 감지된 컬러">
                <span className="metadata-label">Detected colors</span>
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
          </section>

          <section className="form-section">
            <div className="section-heading">
              <h2>Color</h2>
              <p>HEX 값을 기준으로 RGB와 CMYK 정보가 문서에 자동 표기됩니다.</p>
            </div>
            <div className="field-grid three-column">
              {(['primary', 'secondary', 'accent'] as const).map((key) => (
                <label className="field" key={key}>
                  <span>{key[0].toUpperCase() + key.slice(1)}</span>
                  <div className="color-input">
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
          </section>

          <section className="form-section">
            <div className="section-heading">
              <h2>Typography</h2>
              <p>실무에서 자주 사용하는 서체를 선택할 수 있습니다. 기본값은 Pretendard입니다.</p>
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
          </section>

          {error ? <p className="error-message" role="alert">{error}</p> : null}

          <div className="setup-actions">
            <button className="button primary large" type="button" onClick={generate}>가이드라인 생성하기</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell editor-mode">
      <header className="topbar editor-topbar">
        <div className="topbar-inner editor-header-inner">
          <div>
            <strong className="brand-title">BrandCreator</strong>
            <span className="project-name">{project.englishName}</span>
          </div>
          <div className="header-actions">
            <button className="button ghost" onClick={() => setMode('setup')}>프로젝트 정보</button>
            <button className="button secondary" onClick={() => void downloadAllSvg(enabledPages, project.englishName || project.name)}>전체 SVG</button>
            <button className="button primary" onClick={() => window.print()}>PDF로 내보내기</button>
          </div>
        </div>
      </header>

      <main className="editor-layout">
        <aside className="page-sidebar" aria-label="가이드라인 목차">
          <div className="sidebar-heading">
            <strong>CONTENTS</strong>
            <span>{enabledPages.length}/{pages.length}</span>
          </div>
          <div className="page-list">
            {pages.map((page, index) => (
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
            ))}
          </div>
        </aside>

        <section className="preview-area">
          <div className="preview-toolbar">
            <div>
              <span className="metadata-label">{currentPage.title}</span>
              <strong>{currentPage.subtitle || currentPage.id}</strong>
            </div>
            <button className="button tertiary small" onClick={() => downloadSvg(currentPage, project.englishName || project.name)}>현재 페이지 SVG</button>
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
