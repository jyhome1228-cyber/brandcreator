import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';

type LandingProps = { onStart: () => void };
type BetaForm = { name: string; userId: string; phone: string; occupation: string };
const REGISTRATION_KEY = 'bramer-beta-session-v1';
const BETA_END = '2026년 12월 31일';
const initialBetaForm: BetaForm = { name: '', userId: '', phone: '', occupation: '' };

const audiences = [
  {
    key: 'designer', audience: '브랜드 디자이너',
    titleTop: '로고는 완성했는데,', titleBottom: '가이드라인 전달이 막막하다면.',
    description: '디자인 이후 가이드라인의 제작과 편집, 전달 과정을 더 편리하게 이어갈 수 있도록 돕습니다.',
  },
  {
    key: 'brand', audience: '브랜드 운영 기업',
    titleTop: '로고는 있는데,', titleBottom: '브랜드 기준이 없다면.',
    description: '브랜드 운영에 필요한 로고 사용 규정, 컬러, 서체와 응용 기준을 쉽고 체계적으로 정리합니다.',
  },
] as const;

const samples = [
  { title: '브랜드 표지', type: 'cover' },
  { title: '로고 규칙', type: 'logo' },
  { title: '컬러 시스템', type: 'color' },
] as const;

function GuidelinePreview() {
  const [index, setIndex] = useState(0);
  const changePreview = (next: number) => { if (next !== index) setIndex(next); };
  return (
    <div className="bramer-preview" data-reveal>
      <div className="bramer-preview-window">
        <div className="bramer-preview-toolbar">
          <span className="bramer-preview-window-title">가이드라인 미리보기</span>
          <span>{index + 1} / {samples.length}</span>
        </div>
        <div className="bramer-preview-canvas" aria-live="polite"><div className="bramer-preview-transition" key={index}>
          {index === 0 && <div className="bramer-sample bramer-sample-cover">
            <div className="bramer-sample-meta">Brand Guidelines <span>2026</span></div>
            <strong>Brand<br/>Guidelines</strong>
            <div className="bramer-sample-baseline">Your Brand <span>Visual Identity System</span></div>
          </div>}
          {index === 1 && <div className="bramer-sample bramer-sample-logo">
            <div className="bramer-sample-meta">Logo Usage <span>01</span></div>
            <strong>Logo &amp; Clear Space</strong>
            <div className="bramer-sample-logo-demo"><div>Brand.</div></div>
            <div className="bramer-sample-baseline">Primary Logo <span>Minimum Clear Space</span></div>
          </div>}
          {index === 2 && <div className="bramer-sample bramer-sample-color">
            <div className="bramer-sample-meta">Color System <span>02</span></div>
            <strong>Brand Colors</strong>
            <div className="bramer-sample-colors"><div><small>Primary</small><span>#151515</span></div><div><small>Secondary</small><span>#DADADA</span></div><div><small>Accent</small><span>#A6A6A6</span></div></div>
            <div className="bramer-sample-baseline">Color Palette <span>Brand Identity</span></div>
          </div>}
          </div></div>
        <div className="bramer-preview-options" aria-label="미리보기 페이지 선택">
          {samples.map((sample, i) => <button key={sample.type} type="button" className={i === index ? 'active' : ''} aria-pressed={i === index} onClick={() => changePreview(i)}>{sample.title}</button>)}
        </div>
      </div>
      <p className="bramer-preview-note">미리보기는 예시이며, 실제 결과물은 입력한 브랜드 정보에 따라 달라집니다.</p>
    </div>
  );
}

export default function Landing({ onStart }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
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
    if (!betaForm.name.trim() || !/^[a-zA-Z0-9_-]{4,24}$/.test(betaForm.userId.trim()) ||
        !/^[0-9+() -]{8,20}$/.test(betaForm.phone.trim()) || !betaForm.occupation) {
      setBetaError('이름, 아이디(영문·숫자 4~24자), 연락처, 직업을 확인해 주세요.');
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
        <nav aria-label="메인 메뉴" className="bramer-site-menu">
          <a href="#preview">서비스 소개</a>
          <a href="#how">이용 방법</a>
          <a href="#/guide">업종별 가이드</a>
          <a href="#help">도움말</a>
        </nav>
        <button type="button" className="bramer-site-start" onClick={openBeta}>시작하기</button>
      </div>
    </header>

    <main id="top">
      <section className="bramer-home-hero">
        <div className="bramer-hero-image-layer" aria-hidden="true">
          <div className={`bramer-hero-image ${audiences[audienceIndex].key === 'designer' ? 'bramer-hero-image-right' : 'bramer-hero-image-left'}`}/>
        </div>
        <div className="bramer-home-hero-content" data-reveal>
          <p className="bramer-home-overline">브랜드 가이드라인 제작 솔루션</p>
          <div className="bramer-hero-rotation" aria-label="기업과 디자이너를 위한 서비스 소개"
            onMouseEnter={() => setRollPaused(true)}
            onMouseLeave={() => setRollPaused(false)}
            onFocusCapture={() => setRollPaused(true)}
            onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setRollPaused(false); }}>
            <div className="bramer-hero-rotation-stage" aria-live="off">
              <div className="bramer-hero-rotation-slide" key={audiences[audienceIndex].key}>
                <h1>{audiences[audienceIndex].titleTop}<br/><span>{audiences[audienceIndex].titleBottom}</span></h1>
                <p className="bramer-hero-slide-description">{audiences[audienceIndex].description}</p>
              </div>
            </div>
            <div className="bramer-roller-controls" aria-label="대상별 소개 선택">
              {audiences.map((item,index) => <button key={item.key} type="button"
                aria-label={item.audience + ' 소개 보기'} aria-pressed={index === audienceIndex}
                className={index === audienceIndex ? 'active' : ''}
                onClick={() => setAudienceIndex(index)}/>)}
            </div>
          </div>
          <button type="button" className="bramer-home-primary" onClick={openBeta}>베타 무료 체험하기</button>
        </div>
      </section>

      <section className="bramer-home-preview-section" id="preview">
        <div className="bramer-home-section-heading" data-reveal>
          <h2>브랜드의 기준을, 하나의 가이드라인으로.</h2>
          <p>로고와 브랜드 정보를 입력하면<br className="bramer-desktop-break"/> 17개 제작 항목을 기준으로 가이드라인과 기본 응용 디자인을 구성합니다.</p>
        </div>
        <GuidelinePreview/>
      </section>

      <section className="bramer-home-steps-section" id="how">
        <div className="bramer-home-section-heading" data-reveal>
          <span className="bramer-section-eyebrow">HOW IT WORKS / 01</span>
          <h2>어렵지 않게, 순서대로.</h2>
          <p>브랜드 가이드라인을 처음 만드는 사람도<br className="bramer-desktop-break"/> 차근차근 따라 할 수 있도록 구성했습니다.</p>
        </div>
        <div className="bramer-home-steps" data-reveal>
          <article><span className="bramer-step-count">1</span><h3>로고 등록</h3><p>브랜드명과 SVG 로고를 등록하고 기본 정보를 설정하세요.</p></article>
          <article><span className="bramer-step-count">2</span><h3>규칙 검토</h3><p>업종별 참고 기준을 살펴보고 로고 여백과 컬러·서체를 검토하세요.</p></article>
          <article><span className="bramer-step-count">3</span><h3>가이드라인 제작</h3><p>페이지를 확인하고 내용을 편집한 다음 PDF 또는 SVG로 내보내세요.</p></article>
        </div>
      </section>

      <section className="bramer-home-last-section" data-reveal>
        <h2>브랜드의 기준을 만들어볼까요?</h2>
        <p>로고에서 시작해, 브랜드를 더 일관되게.</p>
        <button type="button" className="bramer-home-primary" onClick={openBeta}>지금 시작하기</button>
      </section>
<section className="bramer-help-section" id="help" aria-labelledby="bramer-help-heading">
      <div className="bramer-help-inner">
        <div className="bramer-home-section-heading">
          <span className="bramer-section-eyebrow">HELP & RESOURCES / 02</span>
          <h2 id="bramer-help-heading">이용하면서 궁금한 점이 있나요?</h2>
          <p>준비할 자료부터 파일 저장까지, 자주 묻는 내용을 모았어요.</p>
        </div>
        <div className="bramer-help-grid">
          <article id="resources">
            <h3>준비할 자료</h3>
            <p>브랜드명과 SVG 로고를 먼저 준비해 주세요. 브랜드 컬러, 서체, 소개 문구, 담당자 연락처를 준비하면 명함·서식 제작에도 활용할 수 있어요.</p>
            <a href="#/guide">업종별 준비 자료 확인</a>
          </article>
          <article id="data-info">
            <h3>프로젝트 저장과 불러오기</h3>
            <p>작업은 현재 브라우저에 자동 저장되고 ‘내 프로젝트’에서 이어서 열 수 있어요. 다른 기기에서 사용하려면 JSON 파일을 따로 백업해 주세요.</p>
            <a href="#/create">제작 화면 열기</a>
          </article>
          <article id="privacy-info">
            <h3>파일 이용 안내</h3>
            <p>입력한 브랜드 자료는 브라우저에서 가이드라인을 구성하는 데 사용됩니다. 별도의 계정 및 클라우드 저장 기능은 현재 제공하지 않아요.</p>
            <a href="#/create">제작 공간 둘러보기</a>
          </article>
        </div>
        <section className="bramer-tech-section" id="technology" aria-labelledby="bramer-tech-title">
          <span className="bramer-section-eyebrow">SYSTEM OVERVIEW / 03</span>
          <h3 id="bramer-tech-title">Bramer는 이렇게 작동합니다.</h3>
          <p>브레이머는 업로드한 SVG 로고와 브랜드 정보를 바탕으로 기본적인 사용 규칙을 구성합니다. 로고의 비율과 컬러를 분석하고, 17개 기본 제작 항목에 따라 가이드라인 페이지를 생성합니다.</p>
          <div className="bramer-tech-grid">
            <div><strong>SVG 분석</strong><span>로고의 구조·비율·컬러를 읽고 기본 규칙 설정에 활용합니다.</span></div>
            <div><strong>업종별 구성</strong><span>업종별 우선 검토 사항을 안내하며, 기본 17개 제작 항목은 모든 업종에서 동일하게 제공합니다.</span></div>
            <div><strong>문서 생성과 편집</strong><span>페이지별 내용을 수정하고 SVG 또는 PDF로 결과물을 내보낼 수 있습니다.</span></div>
          </div>
          <p className="bramer-tech-note">로고 여백과 최소 크기는 자동 제안값이며 최종 인쇄·사용 환경에서 확인이 필요합니다. Illustrator AI 원본은 현재 직접 변환하지 않아요. Illustrator에서 파일 → 다른 이름으로 저장 → SVG를 선택해 저장한 파일을 업로드해 주세요. 자동 생성 항목은 브랜드별 검토가 필요합니다.</p>
        </section>
        <div className="bramer-help-faq" id="faq">
          <h3>자주 묻는 질문</h3>
          <details><summary>어떤 로고 파일을 업로드해야 하나요?</summary><p>SVG는 로고의 형태와 크기를 유지하는 벡터 파일이에요. Illustrator AI 원본만 있다면 Illustrator에서 파일 → 다른 이름으로 저장 → 파일 형식 SVG를 선택하세요. 저장한 SVG를 Bramer에 업로드하면 됩니다.</p></details>
          <details><summary>업종별 추천 항목을 수정할 수 있나요?</summary><p>현재는 업종별 특징과 검토할 규칙을 안내하고, 기본 17개 제작 항목은 동일하게 제공합니다. 업종별 안내는 연구 검증 전의 실무 참고 자료입니다.</p></details>
          <details><summary>완성한 가이드라인은 어떻게 저장하나요?</summary><p>페이지별 SVG, 전체 SVG 또는 PDF로 내보낼 수 있습니다. 이후 수정할 계획이라면 프로젝트 JSON도 별도로 저장해 주세요.</p></details>
          <details><summary>모든 가이드라인이 자동으로 완성되나요?</summary><p>로고·컬러·서체와 기본 응용 디자인을 생성합니다. 브랜드 스토리·슬로건·연락처는 직접 입력해야 하며, 사진과 모션은 자동 생성하지 않습니다.</p></details>
        </div>
      </div>
    </section>
    </main>
    <footer className="bramer-home-footer">
      <div className="bramer-footer-inner">
        <div className="bramer-footer-columns">
          <div className="bramer-footer-col"><h3>Bramer</h3><a href="#top">서비스 소개</a><a href="#preview">결과물 미리보기</a><a href="#how">이용 방법</a></div>
          <div className="bramer-footer-col"><h3>가이드라인</h3><a href="#/create">새 가이드라인 만들기</a><a href="#/create">가이드라인 제작</a><a href="#preview">샘플 가이드라인</a></div>
          <div className="bramer-footer-col"><h3>업종별 가이드</h3><a href="#/guide">업종별 추천 구성</a><a href="#/guide">필요한 가이드 항목</a><a href="#/guide">자료 체크리스트</a></div>
          <div className="bramer-footer-col"><h3>자료 준비</h3><a href="#resources">준비 자료 안내</a><a href="#technology">SVG 업로드 안내</a><a href="#data-info">프로젝트 저장 안내</a></div>
          <div className="bramer-footer-col"><h3>지원</h3><a href="#help">도움말</a><a href="#faq">자주 묻는 질문</a><a href="https://github.com/jyhome1228-cyber/brandcreator/commits/main" target="_blank" rel="noopener noreferrer">업데이트 내역</a></div>
          <div className="bramer-footer-col"><h3>이용 안내</h3><a href="#privacy-info">파일 이용 안내</a><a href="#data-info">저장 방식 안내</a><a href="#technology">기술 및 제작 방식</a></div>
        </div>
        <div className="bramer-footer-bottom"><div><strong>BRAMER.</strong><span>브랜드 가이드라인 제작 서비스</span></div><small>현재 제공되는 기능을 기준으로 안내합니다.</small></div>
      </div>
    </footer>
    {betaOpen ? <div className="bramer-beta-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBeta(); }}>
      <div className="bramer-beta-dialog" role="dialog" aria-modal="true" aria-labelledby="bramer-beta-title" aria-describedby="bramer-beta-description" ref={dialogRef} tabIndex={-1}>
        <button type="button" className="bramer-beta-close" aria-label="닫기" onClick={closeBeta}>닫기</button>
        <span className="bramer-beta-label">BRAMER BETA</span>
        <h2 id="bramer-beta-title">12월 31일까지, 자유롭게 체험하세요.</h2>
        <p id="bramer-beta-description">BRAMER는 <strong>{BETA_END}</strong>까지 무료 베타테스트를 진행합니다. 간단한 정보 입력 후 바로 가이드라인을 만들어볼 수 있어요.</p>
        {sessionRegistered ? <div className="bramer-beta-registered">
          <p>이 브라우저에서 베타 체험을 시작했어요. 바로 제작 화면으로 이동할 수 있습니다.</p>
          <button className="bramer-beta-primary" type="button" onClick={enterRegistered}>체험 이어가기</button>
        </div> : <form className="bramer-beta-form" onSubmit={tryBeta}>
          <div className="bramer-beta-field-grid">
            <label><span>성함</span><input autoComplete="name" maxLength={40} value={betaForm.name} onChange={event => setBetaForm(previous => ({ ...previous, name: event.target.value }))} placeholder="성함을 입력해 주세요" required /></label>
            <label><span>아이디</span><input autoComplete="off" maxLength={24} value={betaForm.userId} onChange={event => setBetaForm(previous => ({ ...previous, userId: event.target.value }))} placeholder="영문·숫자 4~24자" pattern="[a-zA-Z0-9_-]{4,24}" required /></label>
            <label><span>연락처</span><input autoComplete="tel" type="tel" maxLength={20} value={betaForm.phone} onChange={event => setBetaForm(previous => ({ ...previous, phone: event.target.value }))} placeholder="연락처를 입력해 주세요" required /></label>
            <label><span>직업</span><select value={betaForm.occupation} onChange={event => setBetaForm(previous => ({ ...previous, occupation: event.target.value }))} required><option value="">선택해 주세요</option><option value="디자이너">디자이너</option><option value="기업 담당자">기업 담당자</option><option value="브랜드 운영자">브랜드 운영자</option><option value="학생·연구자">학생·연구자</option><option value="기타">기타</option></select></label>
          </div>
          <div className="bramer-beta-privacy">
            <label className="bramer-beta-consent"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} required /><span>개인정보처리방침(베타 체험 안내)에 동의합니다. (필수)</span></label>
            <button type="button" className="bramer-beta-privacy-button" aria-expanded={privacyOpen} onClick={() => setPrivacyOpen(previous => !previous)}>개인정보처리방침 {privacyOpen ? '접기' : '보기'}</button>
            {privacyOpen ? <div className="bramer-beta-privacy-text">
              <strong>베타 체험 개인정보처리방침</strong>
              <p>입력 항목: 성함, 아이디, 연락처, 직업. 목적: 베타 체험 등록 화면 확인 및 이용 의사 표시.</p>
              <p><strong>현재 중앙 등록 서버는 연결되어 있지 않습니다.</strong> 입력한 개인정보는 서버로 전송·저장되지 않으며, 화면을 떠나면 입력값이 사라집니다. 브라우저 세션에는 체험 여부만 저장합니다. 연락처로 별도 연락하거나 사용자 계정을 생성하지 않습니다.</p>
              <p>브라우저 세션의 체험 표시를 없애려면 브라우저의 해당 사이트 세션 데이터를 삭제하면 됩니다. 정식 회원 관리 및 개인정보처리방침은 서버 구축 후 별도 공지해야 합니다.</p>
            </div> : null}
          </div>
          <p className="bramer-beta-local-notice">현재는 체험용 등록 화면입니다. 실제 회원 계정이나 서버 등록은 생성되지 않습니다.</p>
          {betaError ? <p className="bramer-beta-error" role="alert">{betaError}</p> : null}
          <button className="bramer-beta-primary" type="submit">등록하고 무료 체험하기</button>
        </form>}
      </div>
    </div> : null}
  </div>;
}
