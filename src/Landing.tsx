import { useState } from 'react';

type LandingProps = {
  onStart: () => void;
};

const features = [
  { index: '01', title: '로고를 이해하는 것부터.', text: 'SVG 로고의 비율과 컬러를 분석하고, 기본 사용 규칙을 제안합니다.', detail: 'SVG ANALYSIS' },
  { index: '02', title: '브랜드에 필요한 기준만.', text: '업종에 따라 추천되는 항목을 살펴보고 필요한 것만 골라 구성하세요.', detail: 'GUIDED STRUCTURE' },
  { index: '03', title: '한 장씩 명확하게.', text: '가이드라인을 직접 수정하고 페이지별로 확인한 뒤 내보낼 수 있어요.', detail: 'EDIT & EXPORT' },
];

function SamplePages() {
  const [active, setActive] = useState(0);
  return (
    <div className="landing-demo">
      <div className="landing-demo-head">
        <span className="landing-demo-mark">Bramer. / Preview</span>
        <span>VISUAL IDENTITY GUIDELINES</span>
      </div>
      <div className="landing-demo-stage">
        {active === 0 ? (
          <div className="landing-demo-paper landing-demo-cover">
            <span className="landing-paper-top">BRAND GUIDELINES <i>2026</i></span>
            <strong>Brand<br/>Guidelines.</strong>
            <span className="landing-demo-circle" aria-hidden="true" />
            <span className="landing-paper-bottom">YOUR BRAND <i>VISUAL IDENTITY SYSTEM</i></span>
          </div>
        ) : active === 1 ? (
          <div className="landing-demo-paper landing-demo-logo">
            <span className="landing-paper-top">01 / LOGO SYSTEM <i>BRAND GUIDELINES</i></span>
            <strong>Logo &amp;<br/>Clear Space.</strong>
            <div className="landing-logo-diagram"><div className="landing-logo-safe">B.</div></div>
            <span className="landing-paper-bottom">PRIMARY LOGO <i>MINIMUM CLEAR SPACE</i></span>
          </div>
        ) : (
          <div className="landing-demo-paper landing-demo-color">
            <span className="landing-paper-top">02 / COLOR SYSTEM <i>BRAND GUIDELINES</i></span>
            <strong>Brand Colors.</strong>
            <div className="landing-color-blocks"><div><span>PRIMARY</span><b>#101010</b></div><div><span>SECONDARY</span><b>#DADADA</b></div><div><span>ACCENT</span><b>#A8A8A8</b></div></div>
            <span className="landing-paper-bottom">COLOR PALETTE <i>BRAND IDENTITY</i></span>
          </div>
        )}
      </div>
      <div className="landing-demo-controls" aria-label="가이드라인 미리보기 선택">
        {['브랜드 표지', '로고 규칙', '컬러 시스템'].map((label, index) => (
          <button type="button" key={label} className={active === index ? 'is-active' : ''} onClick={() => setActive(index)} aria-pressed={active === index}>
            <span>0{index + 1}</span> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Landing({ onStart }: LandingProps) {
  return (
    <div className="bramer-landing">
      <header className="landing-header">
        <div className="landing-shell landing-header-inner">
          <a className="landing-logo" href="#top" aria-label="Bramer 홈">Bramer.</a>
          <nav className="landing-navigation" aria-label="사이트 내비게이션">
            <a href="#preview">미리보기</a><a href="#how-it-works">이용 방법</a><a href="#features">주요 기능</a>
          </nav>
          <button type="button" className="landing-header-cta" onClick={onStart}>시작하기 <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <main id="top">
        <section className="landing-hero landing-shell">
          <div className="landing-hero-eyebrow"><span className="landing-indicator" /> BRAND IDENTITY CREATOR</div>
          <h1>로고에서 시작하는<br/><em>브랜드의 모든 기준.</em></h1>
          <div className="landing-hero-bottom">
            <p>로고 하나로 시작해도 괜찮아요.<br/>브레이머와 함께 브랜드 가이드라인을 쉽고 체계적으로 만들어보세요.</p>
            <button type="button" className="landing-button landing-button-light" onClick={onStart}>가이드라인 만들기 <span aria-hidden="true">↗</span></button>
          </div>
          <div className="landing-hero-foot"><span>YOUR BRAND, BETTER DEFINED.</span><span>SCROLL TO EXPLORE ↓</span></div>
        </section>
        <section id="preview" className="landing-preview-section">
          <div className="landing-shell">
            <div className="landing-section-heading">
              <div><span className="landing-eyebrow">01 / SEE THE RESULT</span><h2>복잡한 규칙을,<br/>한눈에 보이는 가이드로.</h2></div>
              <p>로고의 사용 방법부터 컬러, 서체까지.<br/>브랜드가 일관되게 전달되도록 필요한 기준을 정리합니다.</p>
            </div>
            <SamplePages />
            <p className="landing-demo-disclaimer">위 이미지는 서비스 사용 경험을 보여주는 샘플 디자인이며, 실제 생성 결과는 입력한 브랜드 정보에 따라 달라집니다.</p>
          </div>
        </section>
        <section id="how-it-works" className="landing-process landing-shell">
          <div className="landing-section-heading">
            <div><span className="landing-eyebrow">02 / HOW IT WORKS</span><h2>처음이어도,<br/>어렵지 않게.</h2></div>
            <p>디자인 용어를 모두 알 필요는 없어요.<br/>세 가지 과정으로 브랜드의 기준을 만들어보세요.</p>
          </div>
          <div className="landing-process-grid">
            <article><span>STEP 01</span><div className="landing-process-symbol">↥</div><h3>로고 업로드</h3><p>브랜드명과 SVG 로고를 입력하면 기본 정보를 분석합니다.</p></article>
            <article><span>STEP 02</span><div className="landing-process-symbol">☷</div><h3>규칙 선택</h3><p>업종에 맞는 추천 항목을 살펴보고 필요한 규칙을 선택하세요.</p></article>
            <article><span>STEP 03</span><div className="landing-process-symbol">↗</div><h3>가이드라인 완성</h3><p>내용을 편집하고, 필요한 페이지를 골라 PDF 또는 SVG로 내보내세요.</p></article>
          </div>
        </section>
        <section id="features" className="landing-features">
          <div className="landing-shell">
            <div className="landing-section-heading">
              <div><span className="landing-eyebrow">03 / FEATURES</span><h2>브랜드의 기준을 만드는<br/>더 간편한 방법.</h2></div>
              <p>브레이머는 가이드라인 제작에 필요한<br/>기본 도구를 하나의 화면에 모았습니다.</p>
            </div>
            <div className="landing-feature-list">
              {features.map(feature => (
                <article key={feature.index}><span>{feature.index}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div><small>{feature.detail}</small></article>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-final landing-shell">
          <span className="landing-eyebrow">START WITH YOUR LOGO</span>
          <h2>당신의 브랜드,<br/>기준부터 만들어보세요.</h2>
          <button type="button" className="landing-button landing-button-light" onClick={onStart}>지금 시작하기 <span aria-hidden="true">↗</span></button>
        </section>
      </main>
      <footer className="landing-footer"><div className="landing-shell landing-footer-inner"><strong>Bramer.</strong><span>BRAND IDENTITY CREATOR</span><span>© {new Date().getFullYear()} Bramer</span></div></footer>
    </div>
  );
}
