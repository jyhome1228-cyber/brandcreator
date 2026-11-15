import { useEffect, useRef, useState } from 'react';

type LandingProps = { onStart: () => void };

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
        <a className="bramer-site-logo" href="#top" aria-label="Bramer 홈">Bramer.</a>
        <nav aria-label="메인 메뉴" className="bramer-site-menu">
          <a href="#preview">서비스 소개</a>
          <a href="#how">이용 방법</a>
        </nav>
        <button type="button" className="bramer-site-start" onClick={onStart}>시작하기</button>
      </div>
    </header>

    <main id="top">
      <section className="bramer-home-hero">
        <div className="bramer-home-hero-content" data-reveal>
          <p className="bramer-home-overline">브랜드 가이드라인 제작 서비스</p>
          <h1>로고만 있다면,<br/>브랜드 가이드라인을 시작해보세요.</h1>
          <p className="bramer-home-description">브레이머는 로고와 브랜드 정보를 바탕으로<br className="bramer-desktop-break"/> 필요한 규칙을 정리하고 가이드라인을 제작할 수 있도록 도와줍니다.</p>
          <button type="button" className="bramer-home-primary" onClick={onStart}>가이드라인 만들기</button>
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
        <button type="button" className="bramer-home-primary" onClick={onStart}>지금 시작하기</button>
      </section>
    </main>
    <footer className="bramer-home-footer"><span>Bramer.</span><span>브랜드 가이드라인 제작 서비스</span></footer>
  </div>;
}
