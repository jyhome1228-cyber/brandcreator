import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';

type LandingProps = { onStart: () => void };
type BetaForm = { name: string; phone: string; occupation: string };
const REGISTRATION_KEY = 'bramer-beta-session-v1';
const BETA_END = '2026년 12월 31일';
const initialBetaForm: BetaForm = { name: '', phone: '', occupation: '' };

const audiences = [
  {
    key: 'designer', audience: '브랜드 디자이너',
    titleTop: '로고는 완성했는데,', titleBottom: '가이드라인 전달이 막막하다면.',
    enTop: 'Your logo is ready.', enBottom: 'Your guidelines should be too.',
    enDescription: 'Create, edit, and deliver brand guidelines with ease.',
    description: '디자인 이후 가이드라인의 제작과 편집, 전달 과정을 더 편리하게 이어갈 수 있도록 돕습니다.',
  },
  {
    key: 'brand', audience: '브랜드 운영 기업',
    titleTop: '로고는 있는데,', titleBottom: '브랜드 기준이 없다면.',
    enTop: 'Have a logo,', enBottom: 'but no brand standards?',
    enDescription: 'Build consistent rules for logos, colors, typography, and applications.',
    description: '브랜드 운영에 필요한 로고 사용 규정, 컬러, 서체와 응용 기준을 쉽고 체계적으로 정리합니다.',
  },
] as const;

const samplePages = ['cover', 'logo', 'clearspace', 'color', 'typography', 'application'] as const;
function GuidelinePreview({ english }: { english: boolean }) {
  const [index, setIndex] = useState(0);
  const sampleLogoSrc = window.location.pathname.startsWith('/brandcreator/') ? '/brandcreator/bramer-sample-logo.svg' : '/bramer-sample-logo.svg';
  const labels = english ? ['Cover', 'Logo', 'Clear space', 'Colors', 'Typography', 'Applications'] : ['표지', '로고', '보호 공간', '컬러', '서체', '응용'];
  return (
    <div className="bramer-preview bramer-real-preview" data-reveal>
      <div className="bramer-preview-window">
        <div className="bramer-preview-toolbar">
          <span className="bramer-preview-window-title">{english ? 'BRAMER Brand Guidelines · Sample' : 'BRAMER 브랜드 가이드라인 · 완성형 샘플'}</span>
          <span>{index + 1} / {samplePages.length}</span>
        </div>
        <div className="bramer-preview-canvas">
          <div className="bramer-real-sheet" key={index}>
            <div className="bramer-real-top"><span>BRAMER.</span><span>BRAND GUIDELINES — 2026</span></div>
            {index === 0 ? <div className="bramer-real-cover">
              <img src={sampleLogoSrc} alt="BRAMER" />
              <strong>Brand Guidelines</strong><p>Visual Identity Standards</p>
            </div> : index === 1 ? <div className="bramer-real-body"><div className="bramer-real-kicker">01 — LOGO SYSTEM</div><h3>Primary Logo</h3>
              <div className="bramer-real-logo-field"><img src={sampleLogoSrc} alt="BRAMER primary logo"/></div>
              <p>{english ? 'Use the primary wordmark consistently across brand communication.' : '브랜드 커뮤니케이션 전반에 기본 워드마크를 일관되게 사용합니다.'}</p></div>
            : index === 2 ? <div className="bramer-real-body"><div className="bramer-real-kicker">02 — LOGO SYSTEM</div><h3>Clear Space</h3>
              <div className="bramer-real-clear-field"><div className="bramer-real-clear-border"><img src={sampleLogoSrc} alt="BRAMER clear space example" /></div></div>
              <p>{english ? 'Keep a consistent protective area around the wordmark.' : '워드마크 주변에 일정한 보호 공간을 확보합니다.'}</p></div>
            : index === 3 ? <div className="bramer-real-body"><div className="bramer-real-kicker">03 — COLOR SYSTEM</div><h3>Brand Colors</h3>
              <div className="bramer-real-swatches"><div><span>PRIMARY</span><b>#231815</b></div><div><span>BLACK</span><b>#111111</b></div><div><span>WHITE</span><b>#FFFFFF</b></div></div>
              <p>{english ? 'Primary color is drawn from the supplied BRAMER vector logo; supporting colors are sample recommendations.' : '기본 색상은 제공된 BRAMER 로고를 기준으로 했으며, 보조 컬러는 샘플 제안입니다.'}</p></div>
            : index === 4 ? <div className="bramer-real-body"><div className="bramer-real-kicker">04 — TYPOGRAPHY</div><h3>Typography</h3>
              <div className="bramer-real-type"><strong>Aa Bb Cc</strong><span>BRAMER. — Identity, consistency, clarity.</span><small>HEADLINE / BODY / CAPTION</small></div>
              <p>{english ? 'A simple editorial hierarchy for brand communication.' : '명확한 정보 위계를 위한 타이포그래피 구성 예시입니다.'}</p></div>
            : <div className="bramer-real-body"><div className="bramer-real-kicker">05 — APPLICATION</div><h3>Brand Applications</h3>
              <div className="bramer-real-apps"><div><img src={sampleLogoSrc} alt="BRAMER stationery"/></div><div><img src={sampleLogoSrc} alt="BRAMER card"/></div></div>
              <p>{english ? 'Example stationery and business card layouts using the supplied logo.' : '제공된 로고를 적용한 명함·서식 응용 예시입니다.'}</p></div>}
            <div className="bramer-real-bottom"><span>BRAMER — VISUAL IDENTITY SYSTEM</span><span>{String(index+1).padStart(2,'0')}</span></div>
          </div>
        </div>
        <div className="bramer-preview-options bramer-real-tabs" aria-label={english ? 'Select sample page' : '샘플 페이지 선택'}>
          {samplePages.map((page,i) => <button key={page} type="button" className={i===index?'active':''} aria-pressed={i===index} onClick={() => setIndex(i)}>{labels[i]}</button>)}
        </div>
      </div>
      <p className="bramer-preview-note">{english ? 'Design demonstration based on the provided BRAMER logo. Supporting layouts and colors are illustrative, not approved brand standards.' : '제공된 BRAMER 로고를 활용한 디자인 샘플입니다. 보조 색상과 응용 규정은 확정된 브랜드 규정이 아닌 예시입니다.'}</p>
    </div>
  );
}

export default function Landing({ onStart }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>(() => { try { return localStorage.getItem('bramer-site-language') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } });
  const en = language === 'en';
  const tr = (ko: string, english: string) => en ? english : ko;
  const changeLanguage = (next: 'ko' | 'en') => { setLanguage(next); try { localStorage.setItem('bramer-site-language', next); } catch { /* optional preference */ } };
  const [audienceIndex, setAudienceIndex] = useState(0);
  const [rollPaused, setRollPaused] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);
  const [betaForm, setBetaForm] = useState<BetaForm>(initialBetaForm);
  const [agreed, setAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [betaError, setBetaError] = useState('');
  const [sessionRegistered, setSessionRegistered] = useState(() => {
    try { return sessionStorage.getItem(REGISTRATION_KEY) === 'active'; } catch { return false; }
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const openBeta = (event?: MouseEvent<HTMLButtonElement>) => {
    lastTrigger.current = event?.currentTarget ?? null;
    setBetaError('');
    setBetaOpen(true);
  };
  const closeBeta = () => {
    setBetaOpen(false);
    requestAnimationFrame(() => lastTrigger.current?.focus());
  };
  const tryBeta = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!betaForm.name.trim() || !/^[0-9+() -]{8,20}$/.test(betaForm.phone.trim()) || !betaForm.occupation) {
      setBetaError(tr('성함, 연락처, 직업을 확인해 주세요.','Check your name, phone number, and occupation.'));
      return;
    }
    if (!agreed) { setBetaError('개인정보 이용 안내에 동의해야 진행할 수 있습니다.'); return; }
    try {
      // No registration server exists. Do not persist phone/name on a public static site.
      sessionStorage.setItem(REGISTRATION_KEY, 'active');
    } catch { /* Session use remains possible even with restricted storage */ }
    setSessionRegistered(true);
    setBetaError('');
    setBetaOpen(false);
    onStart();
  };
  const enterRegistered = () => {
    setBetaOpen(false);
    onStart();
  };
  useEffect(() => {
    if (rollPaused || betaOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = window.setInterval(() => setAudienceIndex(index => (index + 1) % audiences.length), 4000);
    return () => window.clearInterval(interval);
  }, [rollPaused, betaOpen]);
  useEffect(() => {
    if (!betaOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeBeta();
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; window.clearTimeout(focusTimer); document.removeEventListener('keydown', onKeyDown); };
  }, [betaOpen]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('bramer-is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
    targets.forEach(el => { el.classList.add('bramer-will-reveal'); observer.observe(el); });
    return () => { observer.disconnect(); targets.forEach(el => el.classList.remove('bramer-will-reveal')); };
  }, []);
  return <div className="bramer-landing" ref={rootRef}>
    <header className="bramer-site-header">
      <div className="bramer-site-header-inner">
        <a className="bramer-site-logo" href="#top" aria-label="Bramer 홈">BRAMER.</a>
        <nav aria-label={tr("메인 메뉴", "Main navigation")} className="bramer-site-menu">
          <a href="#preview">{tr("서비스 소개","Overview")}</a>
          <a href="#how">{tr("이용 방법","How it works")}</a>
          <a href="#/guide">{tr("업종별 가이드","Industry guide")}</a>
          <a href="#help">{tr("도움말","Help")}</a>
        </nav>
        <div className="bramer-language-switch" aria-label="Language"><button type="button" className={!en ? "active" : ""} aria-pressed={!en} onClick={() => changeLanguage("ko")}>KO</button><span>/</span><button type="button" className={en ? "active" : ""} aria-pressed={en} onClick={() => changeLanguage("en")}>EN</button></div><button type="button" className="bramer-site-start" onClick={openBeta}>{tr("시작하기","Get started")}</button>
      </div>
    </header>

    <main id="top">
      <section className="bramer-home-hero">
        <div className="bramer-hero-image-layer" aria-hidden="true">
          <div className={`bramer-hero-image ${audiences[audienceIndex].key === 'designer' ? 'bramer-hero-image-right' : 'bramer-hero-image-left'}`}/>
        </div>
        <div className="bramer-home-hero-content" data-reveal>
          <p className="bramer-home-overline">{tr("브랜드 가이드라인 제작 솔루션","BRAND GUIDELINE CREATION SOLUTION")}</p>
          <div className="bramer-hero-rotation" aria-label="기업과 디자이너를 위한 서비스 소개"
            onMouseEnter={() => setRollPaused(true)}
            onMouseLeave={() => setRollPaused(false)}
            onFocusCapture={() => setRollPaused(true)}
            onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setRollPaused(false); }}>
            <div className="bramer-hero-rotation-stage" aria-live="off">
              <div className="bramer-hero-rotation-slide" key={audiences[audienceIndex].key}>
                <h1>{en ? audiences[audienceIndex].enTop : audiences[audienceIndex].titleTop}<br/><span>{en ? audiences[audienceIndex].enBottom : audiences[audienceIndex].titleBottom}</span></h1>
                <p className="bramer-hero-slide-description">{en ? audiences[audienceIndex].enDescription : audiences[audienceIndex].description}</p>
              </div>
            </div>
            <div className="bramer-roller-controls" aria-label="대상별 소개 선택">
              {audiences.map((item,index) => <button key={item.key} type="button"
                aria-label={item.audience + ' 소개 보기'} aria-pressed={index === audienceIndex}
                className={index === audienceIndex ? 'active' : ''}
                onClick={() => setAudienceIndex(index)}/>)}
            </div>
          </div>
          <button type="button" className="bramer-home-primary" onClick={openBeta}>{tr("베타 무료 체험하기","Try the beta for free")}</button>
        </div>
      </section>

      <section className="bramer-home-preview-section" id="preview">
        <div className="bramer-home-section-heading" data-reveal>
          <h2>{tr("브랜드의 기준을, 하나의 가이드라인으로.","A complete brand guideline, all in one place.")}</h2>
          <p>{tr("로고와 브랜드 정보를 입력하면 17개 제작 항목을 기준으로 가이드라인과 기본 응용 디자인을 구성합니다.","Upload your logo and brand information to build guidelines and applications across 17 core items.")}</p>
        </div>
        <GuidelinePreview english={en}/>
      </section>

      <section className="bramer-home-steps-section" id="how">
        <div className="bramer-home-section-heading" data-reveal>
          <span className="bramer-section-eyebrow">HOW IT WORKS / 01</span>
          <h2>{tr("어렵지 않게, 순서대로.","Simple steps, clear results.")}</h2>
          <p>{tr("브랜드 가이드라인을 처음 만드는 사람도 차근차근 따라 할 수 있도록 구성했습니다.","Designed to guide you through every step, even if this is your first brand guideline.")}</p>
        </div>
        <div className="bramer-home-steps" data-reveal>
          <article><span className="bramer-step-count">1</span><h3>{tr('로고 등록','Upload logo')}</h3><p>{tr('브랜드명과 SVG 로고를 등록하고 기본 정보를 설정하세요.','Add your brand name, SVG logo, and basic information.')}</p></article>
          <article><span className="bramer-step-count">2</span><h3>{tr('규칙 검토','Review standards')}</h3><p>{tr('업종별 참고 기준을 살펴보고 로고 여백과 컬러·서체를 검토하세요.','Review industry guidance, logo spacing, colors, and fonts.')}</p></article>
          <article><span className="bramer-step-count">3</span><h3>{tr('가이드라인 제작','Create guidelines')}</h3><p>{tr('페이지를 확인하고 내용을 편집한 다음 PDF 또는 SVG로 내보내세요.','Edit your pages and export them as PDF or SVG.')}</p></article>
        </div>
      </section>

      <section className="bramer-home-last-section" data-reveal>
        <h2>{tr("브랜드의 기준을 만들어볼까요?","Ready to define your brand standards?")}</h2>
        <p>{tr("로고에서 시작해, 브랜드를 더 일관되게.","Start with your logo. Build a consistent brand.")}</p>
        <button type="button" className="bramer-home-primary" onClick={openBeta}>{tr("지금 시작하기","Start now")}</button>
      </section>
<section className="bramer-help-section" id="help" aria-labelledby="bramer-help-heading">
      <div className="bramer-help-inner">
        <div className="bramer-home-section-heading">
          <span className="bramer-section-eyebrow">HELP & RESOURCES / 02</span>
          <h2 id="bramer-help-heading">{tr("이용하면서 궁금한 점이 있나요?","Need help getting started?")}</h2>
          <p>{tr("준비할 자료부터 파일 저장까지, 자주 묻는 내용을 모았어요.","Find answers about preparing assets and saving your files.")}</p>
        </div>
        <div className="bramer-help-grid">
          <article id="resources">
            <h3>{tr('준비할 자료','What to prepare')}</h3>
            <p>{tr('브랜드명과 SVG 로고를 먼저 준비해 주세요. 브랜드 컬러, 서체, 소개 문구, 담당자 연락처를 준비하면 명함·서식 제작에도 활용할 수 있어요.','Prepare your brand name and SVG logo. Brand colors, fonts, descriptions, and contact details can also be used in stationery designs.')}</p>
            <a href="#/guide">{tr('업종별 준비 자료 확인','Industry preparation guide')}</a>
          </article>
          <article id="data-info">
            <h3>{tr('프로젝트 저장과 불러오기','Saving your projects')}</h3>
            <p>{tr('작업은 현재 브라우저에 자동 저장되고 ‘내 프로젝트’에서 이어서 열 수 있어요. 다른 기기에서 사용하려면 JSON 파일을 따로 백업해 주세요.','Projects are stored in this browser. Export a JSON backup before switching devices.')}</p>
            <a href="#/create">{tr('제작 화면 열기','Open the editor')}</a>
          </article>
          <article id="privacy-info">
            <h3>{tr('파일 이용 안내','How files are handled')}</h3>
            <p>{tr('입력한 브랜드 자료는 브라우저에서 가이드라인을 구성하는 데 사용됩니다. 별도의 계정 및 클라우드 저장 기능은 현재 제공하지 않아요.','Your brand information is processed in your browser. Account-based cloud storage is not yet available.')}</p>
            <a href="#/create">{tr('제작 공간 둘러보기','Explore the workspace')}</a>
          </article>
        </div>
        <section className="bramer-tech-section" id="technology" aria-labelledby="bramer-tech-title">
          <span className="bramer-section-eyebrow">SYSTEM OVERVIEW / 03</span>
          <h3 id="bramer-tech-title">{tr('Bramer는 이렇게 작동합니다.','How BRAMER works.')}</h3>
          <p>{tr('브레이머는 업로드한 SVG 로고와 브랜드 정보를 바탕으로 기본적인 사용 규칙을 구성합니다. 로고의 비율과 컬러를 분석하고, 17개 기본 제작 항목에 따라 가이드라인 페이지를 생성합니다.','BRAMER analyzes your uploaded SVG logo and brand information, including proportions and color, to create guideline pages across 17 core design items.')}</p>
          <div className="bramer-tech-grid">
            <div><strong>{tr('SVG 분석','SVG analysis')}</strong><span>{tr('로고의 구조·비율·컬러를 읽고 기본 규칙 설정에 활용합니다.','Analyzes your logo structure, proportions, and colors.')}</span></div>
            <div><strong>{tr('업종별 구성','Industry guidance')}</strong><span>{tr('업종별 우선 검토 사항을 안내하며, 기본 17개 제작 항목은 모든 업종에서 동일하게 제공합니다.','Offers industry-specific guidance with the same 17 core design items.')}</span></div>
            <div><strong>{tr('문서 생성과 편집','Document creation')}</strong><span>{tr('페이지별 내용을 수정하고 SVG 또는 PDF로 결과물을 내보낼 수 있습니다.','Edit individual pages and export your results as SVG or PDF.')}</span></div>
          </div>
          <p className="bramer-tech-note">{tr('로고 여백과 최소 크기는 자동 제안값이며 최종 인쇄·사용 환경에서 확인이 필요합니다. Illustrator AI 원본은 현재 직접 변환하지 않아요. Illustrator에서 파일 → 다른 이름으로 저장 → SVG를 선택해 저장한 파일을 업로드해 주세요. 자동 생성 항목은 브랜드별 검토가 필요합니다.','Logo spacing and minimum-size settings are suggestions and should be reviewed before production. Save Illustrator files as SVG before uploading. Review all generated brand rules before use.')}</p>
        </section>
        <div className="bramer-help-faq" id="faq">
          <h3>{tr('자주 묻는 질문','Frequently asked questions')}</h3>
          <details><summary>{tr('어떤 로고 파일을 업로드해야 하나요?','What logo file should I upload?')}</summary><p>{tr('SVG는 로고의 형태와 크기를 유지하는 벡터 파일이에요. Illustrator AI 원본만 있다면 Illustrator에서 파일 → 다른 이름으로 저장 → 파일 형식 SVG를 선택하세요. 저장한 SVG를 Bramer에 업로드하면 됩니다.','Upload an SVG vector file. In Illustrator, use Save As and select SVG, then upload that file to BRAMER.')}</p></details>
          <details><summary>{tr('업종별 추천 항목을 수정할 수 있나요?','Can I customize industry recommendations?')}</summary><p>{tr('현재는 업종별 특징과 검토할 규칙을 안내하고, 기본 17개 제작 항목은 동일하게 제공합니다. 업종별 안내는 연구 검증 전의 실무 참고 자료입니다.','BRAMER offers suggested industry-specific considerations. All industries currently share 17 core items. Recommendations are practical references, not validated research findings.')}</p></details>
          <details><summary>{tr('완성한 가이드라인은 어떻게 저장하나요?','How do I save my guideline?')}</summary><p>{tr('페이지별 SVG, 전체 SVG 또는 PDF로 내보낼 수 있습니다. 이후 수정할 계획이라면 프로젝트 JSON도 별도로 저장해 주세요.','You can export individual SVGs, all SVGs, or a PDF. Save a project JSON backup if you plan to edit later.')}</p></details>
          <details><summary>{tr('모든 가이드라인이 자동으로 완성되나요?','Is everything generated automatically?')}</summary><p>{tr('로고·컬러·서체와 기본 응용 디자인을 생성합니다. 브랜드 스토리·슬로건·연락처는 직접 입력해야 하며, 사진과 모션은 자동 생성하지 않습니다.','BRAMER generates core logo, color, typography, and application pages. You must supply your own story, slogan, and contact details. Photos and motion are not generated.')}</p></details>
        </div>
      </div>
    </section>
    </main>
    <footer className="bramer-home-footer">
      <div className="bramer-footer-inner">
        <div className="bramer-footer-columns">
          <div className="bramer-footer-col"><h3>Bramer</h3><a href="#top">{tr('서비스 소개','Overview')}</a><a href="#preview">{tr('결과물 미리보기','Guideline sample')}</a><a href="#how">이용 방법</a></div>
          <div className="bramer-footer-col"><h3>{tr('가이드라인','Guidelines')}</h3><a href="#/create">{tr('새 가이드라인 만들기','New guideline')}</a><a href="#/create">{tr('가이드라인 제작','Guideline editor')}</a><a href="#preview">{tr('샘플 가이드라인','Guideline samples')}</a></div>
          <div className="bramer-footer-col"><h3>{tr('업종별 가이드','Industry guide')}</h3><a href="#/guide">{tr('업종별 추천 구성','Industry recommendations')}</a><a href="#/guide">{tr('필요한 가이드 항목','Guideline contents')}</a><a href="#/guide">{tr('자료 체크리스트','Asset checklist')}</a></div>
          <div className="bramer-footer-col"><h3>{tr('자료 준비','Preparation')}</h3><a href="#resources">{tr('준비 자료 안내','Preparing assets')}</a><a href="#technology">{tr('SVG 업로드 안내','Uploading SVG')}</a><a href="#data-info">{tr('프로젝트 저장 안내','Saving projects')}</a></div>
          <div className="bramer-footer-col"><h3>{tr('지원','Support')}</h3><a href="#help">도움말</a><a href="#faq">{tr('자주 묻는 질문','FAQ')}</a><a href="https://github.com/jyhome1228-cyber/brandcreator/commits/main" target="_blank" rel="noopener noreferrer">{tr('업데이트 내역','Updates')}</a></div>
          <div className="bramer-footer-col"><h3>{tr('이용 안내','Information')}</h3><a href="#privacy-info">{tr('파일 이용 안내','File handling')}</a><a href="#data-info">{tr('저장 방식 안내','Storage options')}</a><a href="#technology">{tr('기술 및 제작 방식','Technology')}</a></div>
        </div>
        <div className="bramer-footer-bottom"><div><strong>BRAMER.</strong><span>{tr('브랜드 가이드라인 제작 서비스','Brand guideline creation service')}</span></div><small>{tr('현재 제공되는 기능을 기준으로 안내합니다.','Features described reflect the current beta version.')}</small></div>
      </div>
    </footer>
    {betaOpen ? <div className="bramer-beta-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBeta(); }}>
      <div className="bramer-beta-dialog" role="dialog" aria-modal="true" aria-labelledby="bramer-beta-title" aria-describedby="bramer-beta-description" ref={dialogRef} tabIndex={-1}>
        <button type="button" className="bramer-beta-close" aria-label={tr('닫기','Close')} onClick={closeBeta}>{tr('닫기','Close')}</button>
        <span className="bramer-beta-label">BRAMER BETA</span>
        <h2 id="bramer-beta-title">{tr("12월 31일까지, 자유롭게 체험하세요.","Explore BRAMER free through December 31.")}</h2>
        <p id="bramer-beta-description">{tr("BRAMER는 2026년 12월 31일까지 무료 베타테스트를 진행합니다. 간단한 정보 입력 후 바로 가이드라인을 만들어볼 수 있어요.","BRAMER is in free beta until December 31, 2026. Enter a few details to start creating your guideline.")}</p>
        {sessionRegistered ? <div className="bramer-beta-registered">
          <p>{tr('이 브라우저에서 베타 체험을 시작했어요. 바로 제작 화면으로 이동할 수 있습니다.','You have started the beta on this browser. Continue to your workspace.')}</p>
          <button className="bramer-beta-primary" type="button" onClick={enterRegistered}>{tr('체험 이어가기','Continue beta')}</button>
        </div> : <form className="bramer-beta-form" onSubmit={tryBeta}>
          <div className="bramer-beta-field-grid">
            <label><span>{tr('성함','Name')}</span><input autoComplete="name" maxLength={40} value={betaForm.name} onChange={event => setBetaForm(previous => ({ ...previous, name: event.target.value }))} placeholder={tr('성함을 입력해 주세요','Enter your name')} required /></label>
            
            <label><span>{tr('연락처','Phone number')}</span><input autoComplete="tel" type="tel" maxLength={20} value={betaForm.phone} onChange={event => setBetaForm(previous => ({ ...previous, phone: event.target.value }))} placeholder={tr('연락처를 입력해 주세요','Enter your phone number')} required /></label>
            <label><span>{tr('직업','Occupation')}</span><select value={betaForm.occupation} onChange={event => setBetaForm(previous => ({ ...previous, occupation: event.target.value }))} required><option value="">{tr('선택해 주세요','Select')}</option><option value="디자이너">{tr('디자이너','Designer')}</option><option value="기업 담당자">{tr('기업 담당자','Company representative')}</option><option value="브랜드 운영자">{tr('브랜드 운영자','Brand manager')}</option><option value="학생·연구자">{tr('학생·연구자','Student / researcher')}</option><option value="기타">{tr('기타','Other')}</option></select></label>
          </div>
          <div className="bramer-beta-privacy">
            <label className="bramer-beta-consent"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} required /><span>{tr('개인정보처리방침(베타 체험 안내)에 동의합니다. (필수)','I agree to the beta privacy notice. (Required)')}</span></label>
            <button type="button" className="bramer-beta-privacy-button" aria-expanded={privacyOpen} onClick={() => setPrivacyOpen(previous => !previous)}>{tr('개인정보처리방침','Privacy notice')} {privacyOpen ? tr('접기','Hide') : tr('보기','View')}</button>
            {privacyOpen ? <div className="bramer-beta-privacy-text">
              <strong>{tr('베타 체험 개인정보처리방침','Beta privacy notice')}</strong>
              <p>{tr('입력 항목: 성함, 연락처, 직업. 목적: 베타 체험 등록 화면 확인 및 이용 의사 표시.','Fields: name, phone number, occupation. Used only for this beta registration interface.')}</p>
              <p>{tr('현재 중앙 등록 서버는 연결되어 있지 않습니다. 입력한 개인정보는 서버로 전송·저장되지 않으며, 화면을 떠나면 입력값이 사라집니다. 브라우저 세션에는 체험 여부만 저장합니다. 연락처로 별도 연락하거나 사용자 계정을 생성하지 않습니다.','No central registration server is connected. Your personal details are not transmitted or stored; only a beta participation flag is saved in this browser session. No user account is created.')}</p>
              <p>{tr('브라우저 세션의 체험 표시를 없애려면 브라우저의 해당 사이트 세션 데이터를 삭제하면 됩니다. 정식 회원 관리 및 개인정보처리방침은 서버 구축 후 별도 공지해야 합니다.','Clear the site session data to reset the beta participation flag. Formal account management and privacy policies will be published when the backend becomes available.')}</p>
            </div> : null}
          </div>
          <p className="bramer-beta-local-notice">{tr('현재는 체험용 등록 화면입니다. 실제 회원 계정이나 서버 등록은 생성되지 않습니다.','This is a preview registration form. It does not create an account or server-side record.')}</p>
          {betaError ? <p className="bramer-beta-error" role="alert">{betaError}</p> : null}
          <button className="bramer-beta-primary" type="submit">{tr('등록하고 무료 체험하기','Register and try for free')}</button>
        </form>}
      </div>
    </div> : null}
  </div>;
}
