import { useMemo, useState, type ChangeEvent } from 'react';
import { parseLogoSvg } from './engines/svgParser';
import { downloadAllSvg, downloadSvg } from './export/download';
import { generateGuidelinePages } from './guideline-system/generatePages';
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
  const [mode, setMode] = useState<'setup' | 'editor'>('setup');
  const [currentId, setCurrentId] = useState('01-cover');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const pages = useMemo(() => postProcessGuidelinePages(generateGuidelinePages(project), project), [project]);
  const currentPage = pages.find((page) => page.id === currentId) ?? pages[0];
  const enabledPages = pages.filter((page) => enabled[page.id] !== false);
  const setupChecks = [
    Boolean(project.name.trim()),
    Boolean(project.englishName.trim()),
    Boolean(project.logo),
    isHex(project.colors.primary),
    Boolean(project.typography.title && project.typography.body),
  ];
  const setupProgress = Math.round((setupChecks.filter(Boolean).length / setupChecks.length) * 100);
  const sectionLabels: Record<GuidelinePage['section'], string> = {
    intro: 'INTRO',
    logo: 'LOGO',
    color: 'COLOR',
    typography: 'TYPOGRAPHY',
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
      <div className="app-shell setup-mode">
        <header className="topbar product-topbar">
          <div className="topbar-inner product-topbar-inner">
            <div className="product-brand">
              <span className="product-mark">BC</span>
              <div>
                <strong className="brand-title">BrandCreator</strong>
                <span className="topbar-meta">Brand Guideline Generator</span>
              </div>
            </div>
            <div className="topbar-status">
              <span className="status-dot" />
              <span>PROJECT SETUP</span>
              <strong>{setupProgress}%</strong>
            </div>
          </div>
        </header>

        <main className="setup-workspace">
          <section className="setup-main">
            <div className="setup-module-stack">
              <section className="setup-module">
                <div className="module-index">01</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">BRAND INFORMATION</span>
                      <h2>브랜드 기본 정보</h2>
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

              <section className="setup-module">
                <div className="module-index">02</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">PRIMARY ASSET</span>
                      <h2>로고 업로드</h2>
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
                  {project.logo?.colors.length ? (
                    <div className="detected-colors" aria-label="SVG에서 감지된 컬러">
                      <div className="inline-label-row">
                        <span className="metadata-label">DETECTED COLORS</span>
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

              <section className="setup-module">
                <div className="module-index">03</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">VISUAL SYSTEM</span>
                      <h2>컬러 & 타이포그래피</h2>
                    </div>
                    <span className="module-state">System</span>
                  </div>
                  <div className="system-split">
                    <div className="system-block">
                      <div className="system-block-title">
                        <strong>Color</strong>
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
                        <strong>Typography</strong>
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

              <section className="setup-module">
                <div className="module-index">04</div>
                <div className="module-content">
                  <div className="module-heading">
                    <div>
                      <span className="module-kicker">LOGO RULES</span>
                      <h2>기본 사용 규정</h2>
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

            <div className="setup-actions creator-actions">
              <div className="action-copy">
                <strong>{pages.length} pages</strong>
                <span>A4 Landscape · Editable SVG · PDF Export</span>
              </div>
              <button className="button primary large creator-primary" type="button" onClick={generate}>
                가이드라인 생성하기
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          <aside className="setup-preview-panel">
            <div className="preview-sticky">
              <div className="preview-panel-heading">
                <div>
                  <span className="metadata-label">LIVE PREVIEW</span>
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
                <p>필수 정보와 로고를 입력하면 바로 브랜드 가이드라인을 생성할 수 있습니다.</p>
              </div>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell editor-mode">
      <header className="topbar editor-topbar">
        <div className="topbar-inner editor-header-inner">
          <div className="product-brand editor-product-brand">
            <span className="product-mark">BC</span>
            <div>
              <strong className="brand-title">BrandCreator</strong>
              <span className="project-name">{project.englishName} · {enabledPages.length} pages</span>
            </div>
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
          <div className="page-list grouped-page-list">
            {(['intro', 'logo', 'color', 'typography', 'end'] as GuidelinePage['section'][]).map((section) => {
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
              <span>A4 Landscape</span>
              <span>Vector</span>
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
