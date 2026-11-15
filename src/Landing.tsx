import { useEffect, useRef, useState } from 'react';

type LandingProps = { onStart: () => void };

const audiences = [
  { key: 'brand', audience: '브랜드 운영 기업', headline: '로고만 가진 기업을 위해', description: '브랜드 운영에 필요한 사용 규칙을 쉽고 체계적으로 정리합니다.' },
  { key: 'designer', audience: '브랜드 디자이너', headline: '로고를 만드는 디자이너를 위해', description: '가이드라인 제작 과정을 더 편리하게 이어갈 수 있도록 돕습니다.' },
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const openBeta = (event?: React.MouseEvent<HTMLButtonElement>) => {
    lastTrigger.current = event?.currentTarget ?? null;
    setBetaOpen(true);
  };
  const closeBeta = () => {
    setBetaOpen(false);
    requestAnimationFrame(() => lastTrigger.current?.focus());
  };
  const tryBeta = () => {
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
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
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
        <div className="bramer-home-hero-content" data-reveal>
          <p className="bramer-home-overline">브랜드 가이드라인 제작 솔루션</p>
          <h1>로고만 있다면,<br/>브랜드의 기준까지.</h1>
          <div className="bramer-audience-roller" aria-label="BRAMER 이용 대상 소개" onMouseEnter={() => setRollPaused(true)} onMouseLeave={() => setRollPaused(false)} onFocusCapture={() => setRollPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setRollPaused(false); }}>
            <div className="bramer-roller-frame" aria-live="off">
              <div key={audiences[audienceIndex].key} className="bramer-roller-slide">
                <span>{audiences[audienceIndex].audience}</span>
                <strong>{audiences[audienceIndex].headline}</strong>
                <p>{audiences[audienceIndex].description}</p>
              </div>
            </div>
            <div className="bramer-roller-controls" aria-label="소개 대상 선택">
              {audiences.map((item,index) => <button key={item.key} type="button" aria-label={item.audience + ' 보기'} aria-pressed={index === audienceIndex} className={index === audienceIndex ? 'active' : ''} onClick={() => setAudienceIndex(index)} />)}
            </div>
          </div>
          <button type="button" className="bramer-home-primary" onClick={openBeta}>베타 무료 체험하기</button>
        </div>
      </section>

      <section className="bramer-home-preview-section" id="preview">
        <div className="bramer-home-section-heading" data-reveal>
          <h2>브랜드의 기준을, 하나의 가이드라인으로.</h2>
          <p>로고 사용 규칙과 컬러, 타이포그래피를 정리하고<br className="bramer-desktop-break"/> 브랜드에 필요한 항목을 선택해 구성할 수 있어요.</p>
        </div>
        <GuidelinePreview/>
      </section>

      <section className="bramer-home-steps-section" id="how">
        <div className="bramer-home-section-heading" data-reveal>
          <h2>어렵지 않게, 순서대로.</h2>
          <p>브랜드 가이드라인을 처음 만드는 사람도<br className="bramer-desktop-break"/> 차근차근 따라 할 수 있도록 구성했습니다.</p>
        </div>
        <div className="bramer-home-steps" data-reveal>
          <article><span className="bramer-step-count">1</span><h3>로고 등록</h3><p>브랜드명과 SVG 로고를 등록하고 기본 정보를 설정하세요.</p></article>
          <article><span className="bramer-step-count">2</span><h3>규칙 선택</h3><p>업종에 맞는 추천 항목을 살펴보고 필요한 규칙을 선택하세요.</p></article>
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
          <h2 id="bramer-help-heading">이용하면서 궁금한 점이 있나요?</h2>
          <p>준비할 자료부터 파일 저장까지, 자주 묻는 내용을 모았어요.</p>
        </div>
        <div className="bramer-help-grid">
          <article id="resources">
            <h3>준비할 자료</h3>
            <p>브랜드명과 SVG 로고를 먼저 준비해 주세요. 업종에 따라 컬러 정보, 제품 사진, 패키지 이미지 등을 추가하면 좋아요.</p>
            <a href="#/guide">업종별 준비 자료 확인</a>
          </article>
          <article id="data-info">
            <h3>프로젝트 저장과 불러오기</h3>
            <p>현재는 계정 저장 방식이 아니에요. 제작 중인 프로젝트를 JSON 파일로 저장하고, 대시보드에서 다시 불러올 수 있어요.</p>
            <a href="#/dashboard">대시보드 열기</a>
          </article>
          <article id="privacy-info">
            <h3>파일 이용 안내</h3>
            <p>입력한 브랜드 자료는 브라우저에서 가이드라인을 구성하는 데 사용됩니다. 별도의 계정 및 클라우드 저장 기능은 현재 제공하지 않아요.</p>
            <a href="#/dashboard">제작 공간 둘러보기</a>
          </article>
        </div>
        <section className="bramer-tech-section" id="technology" aria-labelledby="bramer-tech-title">
          <h3 id="bramer-tech-title">Bramer는 이렇게 작동합니다.</h3>
          <p>브레이머는 업로드한 SVG 로고와 브랜드 정보를 바탕으로 기본적인 사용 규칙을 구성합니다. 로고의 비율과 컬러를 분석하고, 사용자가 선택한 업종과 항목에 따라 가이드라인 페이지를 생성합니다.</p>
          <div className="bramer-tech-grid">
            <div><strong>SVG 분석</strong><span>로고의 구조·비율·컬러를 읽고 기본 규칙 설정에 활용합니다.</span></div>
            <div><strong>업종별 구성</strong><span>초기 추천안을 제공하며 필요한 항목은 직접 추가하거나 제외할 수 있습니다.</span></div>
            <div><strong>문서 생성과 편집</strong><span>페이지별 내용을 수정하고 SVG 또는 PDF로 결과물을 내보낼 수 있습니다.</span></div>
          </div>
          <p className="bramer-tech-note">로고 여백과 최소 크기는 자동 제안값이며 최종 인쇄·사용 환경에서 확인이 필요합니다. Illustrator AI 원본은 현재 직접 변환하지 않아요. Illustrator에서 파일 → 다른 이름으로 저장 → SVG를 선택해 저장한 파일을 업로드해 주세요. 자동 생성 항목은 브랜드별 검토가 필요합니다.</p>
        </section>
        <div className="bramer-help-faq" id="faq">
          <h3>자주 묻는 질문</h3>
          <details><summary>어떤 로고 파일을 업로드해야 하나요?</summary><p>SVG는 로고의 형태와 크기를 유지하는 벡터 파일이에요. Illustrator AI 원본만 있다면 Illustrator에서 파일 → 다른 이름으로 저장 → 파일 형식 SVG를 선택하세요. 저장한 SVG를 Bramer에 업로드하면 됩니다.</p></details>
          <details><summary>업종별 추천 항목을 수정할 수 있나요?</summary><p>네. 추천 항목은 제작 화면에서 추가하거나 제외할 수 있습니다. 현재의 추천값은 연구 검증 전의 초기 설정입니다.</p></details>
          <details><summary>완성한 가이드라인은 어떻게 저장하나요?</summary><p>페이지별 SVG, 전체 SVG 또는 PDF로 내보낼 수 있습니다. 이후 수정할 계획이라면 프로젝트 JSON도 별도로 저장해 주세요.</p></details>
          <details><summary>모든 가이드라인이 자동으로 완성되나요?</summary><p>로고와 컬러의 기본 규칙은 자동으로 구성할 수 있지만, 사진 스타일·언어·응용 디자인 등은 브랜드별 내용을 직접 확정해야 합니다.</p></details>
        </div>
      </div>
    </section>
    </main>
    <footer className="bramer-home-footer">
      <div className="bramer-footer-inner">
        <div className="bramer-footer-columns">
          <div className="bramer-footer-col"><h3>Bramer</h3><a href="#top">서비스 소개</a><a href="#preview">결과물 미리보기</a><a href="#how">이용 방법</a></div>
          <div className="bramer-footer-col"><h3>가이드라인</h3><a href="#/create">새 가이드라인 만들기</a><a href="#/dashboard">제작 대시보드</a><a href="#preview">샘플 가이드라인</a></div>
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
        <span className="bramer-beta-label">BETA TEST</span>
        <h2 id="bramer-beta-title">BRAMER 베타테스트에 오신 것을 환영합니다.</h2>
        <p id="bramer-beta-description">현재 BRAMER는 기능과 사용성을 개선하는 베타테스트 기간입니다. 회원가입 없이 무료로 가이드라인 제작 기능을 체험할 수 있어요.</p>
        <div className="bramer-beta-info">
          <p><strong>바로 체험 가능</strong><span>로고 SVG 분석, 업종별 항목 선택, 가이드라인 편집 및 출력</span></p>
          <p><strong>프로젝트 보관</strong><span>계정이나 클라우드 저장은 아직 제공하지 않습니다. 작업을 이어가려면 프로젝트 JSON 파일을 저장해 주세요.</span></p>
          <p><strong>이용 전 확인</strong><span>일부 자동 추천·생성 기능은 개선 중입니다. 최종 사용·인쇄 전 직접 결과물을 검토해 주세요.</span></p>
        </div>
        <div className="bramer-beta-actions">
          <button type="button" onClick={closeBeta} className="bramer-beta-secondary">다음에 이용하기</button>
          <button type="button" onClick={tryBeta} className="bramer-beta-primary">무료로 체험하기</button>
        </div>
      </div>
    </div> : null}
  </div>;
}
