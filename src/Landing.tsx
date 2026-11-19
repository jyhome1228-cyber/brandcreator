import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent, type TouchEvent, type KeyboardEvent } from 'react';
import BramerLogo from './components/BramerLogo';
import { parseLogoSvg } from './engines/svgParser';
import { generateV2Pages } from './guideline-system/v2Pages';
import { localizeGuidelinePages } from './guideline-system/localizeGuideline';
import type { BrandProject } from './types/guideline';
import {registerLocalBeta,verifyLocalBeta} from './betaLocalAccess';
import { registerFirebaseBetaTester } from './firebaseBetaRegistration';

type LandingProps = { onStart: (newRegistration?: boolean) => void; onManifesto: () => void };
type BetaForm = { name: string; phone: string; occupation: string };
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

const bramerSampleBase: BrandProject = {
  name: '브레이머',
  englishName: 'BRAMER',
  description: 'BRAMER는 로고를 완성한 이후에도 브랜드가 일관된 모습으로 사용될 수 있도록 돕는 브랜드 가이드라인 제작 솔루션입니다. 로고의 비례와 보호 공간, 최소 사용 크기부터 컬러와 타이포그래피, 명함과 공식 서식에 이르기까지 다양한 제작 기준을 하나의 문서로 정리합니다. 디자이너는 반복적인 문서 작업을 줄이고 브랜드 운영자는 명확한 기준을 공유할 수 있습니다. BRAMER는 디자인 결과물이 실제 업무와 다양한 접점에서 지속적으로 활용되도록 돕는 체계적인 제작 환경을 지향합니다.',
  slogan: 'From Logo to Brand Standards.',
  year: '2026',
  logo: null,
  colors: { primary: '#000000', secondary: '#FFFFFF', accent: '#777777' },
  typography: { title: 'Inter', body: 'Pretendard' },
  rules: { clearSpace: 0.25, minimumPrintMm: 10, minimumDigitalPx: 40 },
  contact: { personName: '홍길동', position: 'Brand Designer', phone: '010-1234-5678', email: 'hello@bramer.kr', website: 'www.bramer.kr', company: 'BRAMER', address: '서울특별시 성동구 성수이로12길 8, 4층' },
};

function GuidelinePreview({ english }: { english: boolean }) {
  const [mobilePreview, setMobilePreview] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
  );
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const onChange = () => setMobilePreview(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const [sampleProject, setSampleProject] = useState<BrandProject | null>(null);
  const [sampleError, setSampleError] = useState(false);
  const [index, setIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<'overview' | 'detail'>('overview');
  const [outgoingSvg, setOutgoingSvg] = useState<string | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [transitionKey, setTransitionKey] = useState(0);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const changePage = (next: number, total: number) => {
    if (!total) return;
    const normalized = ((next % total) + total) % total;
    if (normalized === index) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setTransitionDirection(next < index ? 'backward' : 'forward');
    setOutgoingSvg(!reduceMotion && pages[index] ? pages[index].svg : null);
    setTransitionKey(key => key + 1);
    setIndex(normalized);
    leaveTimer.current = setTimeout(() => setOutgoingSvg(null), 540);
  };
  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);
  useEffect(() => {
    if (mobilePreview) {
      setSampleProject(null);
      setSampleError(false);
      return;
    }
    let cancelled = false;
    const source = window.location.pathname.startsWith("/brandcreator/") ? "/brandcreator/bramer-sample-logo.svg" : "/bramer-sample-logo.svg";
    fetch(source)
      .then(response => { if (!response.ok) throw new Error('Sample logo unavailable'); return response.text(); })
      .then(svg => {
        if (!cancelled) {
          // Preview-only monochrome variant; original source asset remains unchanged.
          const logo = parseLogoSvg(svg.replace(/#231815/gi, '#000000'), 'bramer-sample-logo.svg');
          setSampleProject({
            ...bramerSampleBase,
            logo,
            rules: {
              clearSpace: logo.analysis.recommendation.clearSpace,
              minimumPrintMm: logo.analysis.recommendation.minimumPrintMm,
              minimumDigitalPx: logo.analysis.recommendation.minimumDigitalPx,
            },
          });
        }
      })
      .catch(() => { if (!cancelled) setSampleError(true); });
    return () => { cancelled = true; };
  }, [mobilePreview]);
  const pages = useMemo(() => {
    if (!sampleProject) return [];
    const generated = localizeGuidelinePages(generateV2Pages(sampleProject), english ? 'en' : 'ko');
    // The BRAMER demo uses a strict monochrome presentation. Other brands
    // retain the original guideline engine's guide and warning colors.
    const monochrome = (svg: string) => svg.replace(
      /#(?:5CC4D3|7297BD|91A9C1|93B7C8|B95151|B04343|E25555|B45A2A)/gi,
      '#767676',
    );
    return generated.map(page => ({ ...page, svg: monochrome(page.svg) }));
  }, [sampleProject, english]);
  useEffect(() => { if (index >= pages.length && pages.length) setIndex(0); }, [pages.length, index]);
  const onSwipeStart = (event: TouchEvent<HTMLDivElement>) => { touchStartX.current = event.touches[0]?.clientX ?? null; };
  const onSwipeEnd = (event: TouchEvent<HTMLDivElement>) => {
    const x = touchStartX.current;
    touchStartX.current = null;
    if (x === null || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - x;
    if (Math.abs(dx) > 45) changePage(index + (dx < 0 ? 1 : -1),pages.length);
  };
  const onPreviewKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key==='ArrowRight'){event.preventDefault();changePage(index+1,pages.length);}
    if (event.key==='ArrowLeft'){event.preventDefault();changePage(index-1,pages.length);}
    if (event.key==='Home'){event.preventDefault();changePage(0,pages.length);}
    if (event.key==='End'){event.preventDefault();changePage(pages.length-1,pages.length);}
  };
  const current = pages[index];
  const selectedImage = useMemo(() => current ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(current.svg)}` : '', [current]);
  const overviewImages = useMemo(
    () => pages.map(page => ({ id: page.id, title: page.title, image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(page.svg)}` })),
    [pages],
  );
  const showDetail = (pageIndex: number) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOutgoingSvg(null);
    setTransitionKey(key => key + 1);
    setIndex(pageIndex);
    setPreviewMode('detail');
  };
  return (
    <div className="bramer-preview bramer-engine-preview" data-reveal>
      {mobilePreview ? (
        <div className="bramer-mobile-logo-preview" role="img" aria-label={english ? 'BRAMER logo on a black background' : '검은 배경에 배치한 BRAMER 로고'}>
          <BramerLogo light className="bramer-mobile-preview-logo" />
        </div>
      ) : (
      <>
      <div className="bramer-preview-view-switch" role="group" aria-label={english ? 'Select guideline view' : '가이드라인 보기 방식'}>
        <button type="button" className={previewMode === 'overview' ? 'active' : ''} aria-pressed={previewMode === 'overview'}
          onClick={() => setPreviewMode('overview')}>{english ? 'View all' : '전체 보기'}</button>
        <button type="button" className={previewMode === 'detail' ? 'active' : ''} aria-pressed={previewMode === 'detail'}
          onClick={() => setPreviewMode('detail')}>{english ? 'Page view' : '페이지 보기'}</button>
      </div>
      {previewMode === 'overview' ? (
        <section className="bramer-preview-overview" aria-label={english ? 'Complete guideline gallery' : '전체 브랜드 가이드라인 보기'}>
          <div className="bramer-preview-overview-head">
            <span>{english ? 'BRAMER BRAND GUIDELINES' : 'BRAMER 브랜드 가이드라인'}</span>
            <span>{String(pages.length).padStart(2, '0')} {english ? 'PAGES' : 'PAGES'}</span>
          </div>
          {pages.length ? (
            <div className="bramer-preview-gallery">
              {overviewImages.map((page, pageIndex) => (
                <button type="button" className="bramer-preview-gallery-card" key={page.id}
                  title={page.title} aria-label={english ? `Open page ${pageIndex + 1}: ${page.title}` : `${pageIndex + 1}페이지 ${page.title} 자세히 보기`}
                  onClick={() => showDetail(pageIndex)}>
                  <span className="bramer-preview-gallery-paper">
                    <img src={page.image} alt="" loading={pageIndex < 10 ? 'eager' : 'lazy'} draggable={false}/>
                  </span>
                  <span className="bramer-preview-gallery-meta"><span>{String(pageIndex + 1).padStart(2,'0')}</span><span>{page.title}</span></span>
                </button>
              ))}
            </div>
          ) : (
            <p className="bramer-engine-loading" role="status">{sampleError ? (english ? 'Preview unavailable' : '미리보기를 불러올 수 없습니다.') : (english ? 'Preparing pages…' : '가이드라인을 준비하고 있습니다…')}</p>
          )}
        </section>
      ) : (
        <div className="bramer-preview-window bramer-preview-detail-view">
          <div className="bramer-preview-toolbar" aria-label={english ? 'Guideline page number' : '가이드라인 페이지 번호'}>
            <span className="bramer-preview-page-count">{pages.length ? `${String(index+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}` : '—'}</span>
          </div>
          <div className="bramer-preview-canvas bramer-engine-canvas bramer-engine-side-controls" aria-live="polite" tabIndex={0} role="region"
            aria-label={english ? 'Guideline sample, use arrow keys or swipe to change pages' : '가이드라인 미리보기, 방향키 또는 스와이프로 페이지 이동'}
            onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} onKeyDown={onPreviewKey}>
            <div className="bramer-preview-page-stage">
              {outgoingSvg ? <img aria-hidden="true" alt="" className={`bramer-engine-exit-page ${transitionDirection}`}
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(outgoingSvg)}`} /> : null}
              {current ? <img className={`bramer-engine-page bramer-engine-enter-page ${transitionDirection}`}
                key={current.id+'-'+transitionKey+(english?'-en':'-ko')} src={selectedImage}
                alt={`${current.title} — ${current.subtitle}`} loading="eager"/> :
                <p className="bramer-engine-loading" role="status">{sampleError?(english?'Preview unavailable':'미리보기를 불러올 수 없습니다.'):(english?'Preparing preview…':'미리보기를 준비하고 있습니다…')}</p>}
            </div>
            {pages.length>0 && <>
              <button type="button" className="bramer-preview-side-button previous" onClick={()=>changePage(index-1,pages.length)}
                aria-label={english?'Previous page':'이전 페이지'}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="23" height="23"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              <button type="button" className="bramer-preview-side-button next" onClick={()=>changePage(index+1,pages.length)}
                aria-label={english?'Next page':'다음 페이지'}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="23" height="23"><path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </>}
          </div>
          {pages.length>0 && <div className="bramer-preview-page-select">
            <label className="bramer-engine-jump"><span className="bramer-sr-only">{english?'Select page':'페이지 선택'}</span>
              <select aria-label={english?'Jump to page':'페이지 바로 이동'} value={index}
                onChange={event=>changePage(Number(event.target.value),pages.length)}>
                {pages.map((page,i)=><option value={i} key={page.id}>{String(i+1).padStart(2,'0')} · {page.title}</option>)}
              </select>
            </label>
          </div>}
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default function Landing({ onStart, onManifesto }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>(() => { try { return localStorage.getItem('bramer-site-language') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } });
  const en = language === 'en';
  const tr = (ko: string, english: string) => en ? english : ko;
  const changeLanguage = (next: 'ko' | 'en') => { setLanguage(next); try { localStorage.setItem('bramer-site-language', next); } catch { /* optional preference */ } };
  const [audienceIndex, setAudienceIndex] = useState(0);
  const [rollPaused, setRollPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [betaOpen, setBetaOpen] = useState(() => {
    try {
      const shouldOpen = sessionStorage.getItem('bramer-open-registration-v1') === '1';
      if (shouldOpen) sessionStorage.removeItem('bramer-open-registration-v1');
      return shouldOpen;
    } catch { return false; }
  });
  const [betaMode, setBetaMode] = useState<'choice'|'register'|'login'>('register');
  const [occupationOpen,setOccupationOpen] = useState(false);
  const [loginForm,setLoginForm] = useState({name:'',phone:''});
  const [submitting,setSubmitting] = useState(false);
  const [betaForm, setBetaForm] = useState<BetaForm>(initialBetaForm);
  const [agreed, setAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [betaError, setBetaError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const openBeta = (event?: MouseEvent<HTMLButtonElement>, mode:'choice'|'register'|'login'='choice') => {
    lastTrigger.current = event?.currentTarget ?? null;
    setBetaError('');
    setOccupationOpen(false);
    setBetaMode(mode);
    setBetaOpen(true);
  };
  const closeBeta = () => {
    setBetaOpen(false);
    setOccupationOpen(false);
    requestAnimationFrame(() => lastTrigger.current?.focus());
  };
  const tryBeta = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!betaForm.name.trim() || !/^\d{9,11}$/.test(betaForm.phone.replace(/\D/g,'')) || !betaForm.occupation) {
      setBetaError(tr('성함, 연락처, 직업을 확인해 주세요.','Please check your name, phone number and occupation.'));
      return;
    }
    if (!agreed) { setBetaError(tr('개인정보 이용 안내에 동의해 주세요.','Please agree to the privacy notice.')); return; }
    setSubmitting(true);
    try {
      await registerFirebaseBetaTester(betaForm.name,betaForm.phone,betaForm.occupation);
      await registerLocalBeta(betaForm.name,betaForm.phone,betaForm.occupation);
      setBetaOpen(false);
      setBetaError('');
      // Registration always presents the welcome sequence, even on a reused browser.
      onStart(true);
    } catch (e) {
      setBetaError(e instanceof Error?e.message:tr('등록 정보를 저장하지 못했습니다. 다시 시도해 주세요.','Registration could not be saved. Please try again.'));
    } finally {setSubmitting(false);}
  };
  const tryLogin = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if(submitting)return;
    if(!loginForm.name.trim()||!loginForm.phone.trim()){setBetaError(tr('성함과 연락처를 입력해 주세요.','Enter your name and phone number.'));return;}
    setSubmitting(true);
    const valid=await verifyLocalBeta(loginForm.name,loginForm.phone);
    setSubmitting(false);
    if(!valid){
      setBetaError(tr('등록 정보와 일치하지 않습니다. 이 브라우저에서 처음 등록했는지 확인해 주세요.','The details do not match the registration saved in this browser.'));
      return;
    }
    setBetaOpen(false);
    onStart(false);
  };
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileMenuOpen]);
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
        <a className="bramer-site-logo" href="#top" aria-label="Bramer 홈"><BramerLogo light /></a>
        <nav aria-label={tr("메인 메뉴", "Main navigation")} className="bramer-site-menu">
          <a href="#preview">{tr("서비스 소개","Overview")}</a>
          <a href="#how">{tr("이용 방법","How it works")}</a>
          <a href="#/guide">{tr("업종별 가이드","Industry guide")}</a>
          <a href="#/technology" onClick={event=>{event.preventDefault();onManifesto()}}>{tr("기술 소개","Technology")}</a>
        </nav>
        <div className="bramer-site-actions">
          <div className="bramer-language-switch" aria-label="Language"><button type="button" className={!en ? "active" : ""} aria-pressed={!en} onClick={() => changeLanguage("ko")}>KO</button><span>/</span><button type="button" className={en ? "active" : ""} aria-pressed={en} onClick={() => changeLanguage("en")}>EN</button></div>
          <button type="button" className="bramer-site-start" onClick={event => {setMobileMenuOpen(false);openBeta(event,'choice')}}>{tr("시작하기","Get started")}</button>
          <button type="button" className="bramer-mobile-menu-trigger" aria-label={mobileMenuOpen ? tr("메뉴 닫기","Close menu") : tr("메뉴 열기","Open menu")} aria-expanded={mobileMenuOpen} aria-controls="bramer-mobile-site-nav" onClick={() => setMobileMenuOpen(open => !open)}>
            <span/><span/>
          </button>
        </div>
      </div>
      {mobileMenuOpen && <div className="bramer-mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <nav id="bramer-mobile-site-nav" className={`bramer-mobile-menu ${mobileMenuOpen ? 'open' : ''}`} aria-label={tr("모바일 메뉴","Mobile navigation")} aria-hidden={!mobileMenuOpen}>
        <a href="#preview" onClick={() => setMobileMenuOpen(false)}>{tr("서비스 소개","Overview")}</a>
        <a href="#how" onClick={() => setMobileMenuOpen(false)}>{tr("이용 방법","How it works")}</a>
        <a href="#/guide" onClick={() => setMobileMenuOpen(false)}>{tr("업종별 가이드","Industry guide")}</a>
        <a href="#/technology" onClick={event => {event.preventDefault();setMobileMenuOpen(false);onManifesto()}}>{tr("기술 소개","Technology")}</a>
      </nav>
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
          <button type="button" className="bramer-home-primary" onClick={event => openBeta(event,'register')}>{tr("베타 무료 체험하기","Try the beta for free")}</button>
          <button type="button" className="bramer-hero-tech-link" onClick={onManifesto}>{tr("BRAMER 기술 살펴보기","Explore the system")}</button>
        </div>
      </section>

      <section className="bramer-home-preview-section" id="preview">
        <div className="bramer-home-section-heading" data-reveal>
          <h2>{tr("로고 디자인만 있다면, 브랜드 가이드라인이 뚝딱.","A logo is all you need to start.")}</h2>
          <p>{tr("로고부터 브랜드의 사용 규칙과 응용 디자인까지, 한눈에 확인하세요.","Explore the complete brand guideline, from your logo to everyday applications.")}</p>
        </div>
        <GuidelinePreview english={en}/>
      </section>

      <section className="bramer-home-steps-section" id="how">
        <div className="bramer-home-section-heading" data-reveal>
          <span className="bramer-section-eyebrow">HOW IT WORKS / 01</span>
          <h2>{tr("어렵지 않게, 순서대로.","Simple steps, clear results.")}</h2>
          <p>{tr("세 단계로 명확하게 완성하세요.","Three clear steps. One consistent brand.")}</p>
        </div>
        <div className="bramer-home-process" data-reveal>
          <div className="bramer-process-list">
            <article className="bramer-process-step">
              <div className="bramer-process-index"><span>01</span></div>
              <div className="bramer-process-copy"><h3>{tr('브랜드의 시작을 등록합니다.','Start with your brand.')}</h3><p>{tr('브랜드명과 SVG 로고를 입력하세요. 컬러와 서체를 더하면 브랜드의 기본 정보가 완성됩니다.','Upload an SVG logo and enter your brand name. Add colors and typography to establish the foundation.')}</p></div>
              <div className="bramer-process-graphic bramer-process-graphic-logo" aria-hidden="true"><span>BRAND.</span><i/></div>
            </article>
            <article className="bramer-process-step">
              <div className="bramer-process-index"><span>02</span></div>
              <div className="bramer-process-copy"><h3>{tr('브랜드의 사용 기준을 정리합니다.','Define consistent standards.')}</h3><p>{tr('로고의 비례와 보호 공간, 최소 크기와 컬러 규칙을 확인하고 필요한 기준을 조정하세요.','Review logo proportions, clear space, minimum sizes and color rules, then refine them as needed.')}</p></div>
              <div className="bramer-process-graphic bramer-process-graphic-grid" aria-hidden="true"><span>B.</span><i/></div>
            </article>
            <article className="bramer-process-step">
              <div className="bramer-process-index"><span>03</span></div>
              <div className="bramer-process-copy"><h3>{tr('하나의 가이드라인으로 완성합니다.','Create and deliver your guideline.')}</h3><p>{tr('17개 제작 항목과 응용 디자인을 하나의 문서로 검토하고 PDF 또는 SVG로 내보내세요.','Review 17 core items and applications in one document, then export to PDF or SVG.')}</p></div>
              <div className="bramer-process-graphic bramer-process-graphic-pages" aria-hidden="true"><i/><i/><i/><span>GUIDELINES</span></div>
            </article>
          </div>
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
            <a href="#/guide">{tr('업종별 가이드 보기','View industry guide')}</a>
          </article>
          <article id="data-info">
            <h3>{tr('프로젝트 저장과 불러오기','Saving your projects')}</h3>
            <p>{tr('작업은 현재 브라우저에 저장됩니다. 다른 기기와 자동으로 동기화되지는 않으니 저장된 자료를 정기적으로 확인해 주세요.','Projects are stored in this browser and are not synced across devices.')}</p>
            <button type="button" className="bramer-help-link-button" onClick={event=>openBeta(event,'register')}>{tr('베타 등록하고 시작하기','Register for beta')}</button>
          </article>
          <article id="privacy-info">
            <h3>{tr('파일 이용 안내','How files are handled')}</h3>
            <p>{tr('입력한 브랜드 자료는 브라우저에서 가이드라인을 구성하는 데 사용됩니다. 별도의 계정 및 클라우드 저장 기능은 현재 제공하지 않아요.','Your brand information is processed in your browser. Account-based cloud storage is not yet available.')}</p>
            <button type="button" className="bramer-help-link-button" onClick={event=>openBeta(event,'register')}>{tr('무료 체험 시작하기','Start free trial')}</button>
          </article>
        </div>
        <section className="bramer-tech-section bramer-tech-editorial" id="technology" aria-labelledby="bramer-tech-title">
          <span className="bramer-section-eyebrow">BRAMER / THE SYSTEM</span>
          <h3 id="bramer-tech-title">{tr('브랜드를 위한 정교한 시스템.','A system for every brand.')}</h3>
          <p>{tr('로고에서 가이드라인까지. BRAMER의 기술과 설계 기준을 살펴보세요.','Explore the technology behind BRAMER.')}</p>
          <button type="button" className="bramer-tech-open-docs" onClick={onManifesto}>{tr('기술과 설계 원칙 자세히 보기','Explore the technology')}</button>
        </section>
        <div className="bramer-help-faq" id="faq">
          <h3>{tr('자주 묻는 질문','Frequently asked questions')}</h3>
          <details><summary>{tr('어떤 로고 파일을 업로드해야 하나요?','What logo file should I upload?')}</summary><p>{tr('SVG는 로고의 형태와 크기를 유지하는 벡터 파일이에요. Illustrator AI 원본만 있다면 Illustrator에서 파일 → 다른 이름으로 저장 → 파일 형식 SVG를 선택하세요. 저장한 SVG를 Bramer에 업로드하면 됩니다.','Upload an SVG vector file. In Illustrator, use Save As and select SVG, then upload that file to BRAMER.')}</p></details>
          <details><summary>{tr('업종별 추천 항목을 수정할 수 있나요?','Can I customize industry recommendations?')}</summary><p>{tr('업종별로 필요한 사용 기준을 참고할 수 있으며, 기본 가이드라인 구성은 동일하게 제공됩니다.','Explore recommendations for different industries. The core guideline structure remains consistent.')}</p></details>
          <details><summary>{tr('완성한 가이드라인은 어떻게 저장하나요?','How do I save my guideline?')}</summary><p>{tr('페이지별 SVG, 전체 SVG 또는 PDF로 내보낼 수 있습니다. 프로젝트는 현재 브라우저에 저장됩니다.','Export individual SVGs, a complete SVG set, or a PDF. Projects are stored in this browser.')}</p></details>
          <details><summary>{tr('모든 가이드라인이 자동으로 완성되나요?','Is everything generated automatically?')}</summary><p>{tr('로고·컬러·서체와 기본 응용 디자인을 생성합니다. 브랜드 스토리·슬로건·연락처는 직접 입력해야 하며, 사진과 모션은 자동 생성하지 않습니다.','BRAMER generates core logo, color, typography, and application pages. You must supply your own story, slogan, and contact details. Photos and motion are not generated.')}</p></details>
        </div>
      </div>
    </section>
    </main>
    <footer className="bramer-home-footer">
      <div className="bramer-footer-inner">
        <div className="bramer-footer-columns bramer-footer-curated">
          <div className="bramer-footer-col"><h3>BRAMER</h3>
            <a href="#preview">{tr('가이드라인 미리보기','Guideline preview')}</a>
            <a href="#how">{tr('이용 방법','How it works')}</a>
          </div>
          <div className="bramer-footer-col"><h3>{tr('가이드','Guides')}</h3>
            <a href="#/guide">{tr('업종별 가이드','Industry guide')}</a>
            <a href="#faq">{tr('자주 묻는 질문','FAQ')}</a>
          </div>
          <div className="bramer-footer-col"><h3>{tr('기술 소개','Technology')}</h3>
            <a href="#/technology" onClick={event=>{event.preventDefault();onManifesto()}}>{tr('설계와 기술','Design & technology')}</a>
          </div>
          <div className="bramer-footer-col"><h3>{tr('이용하기','Get started')}</h3>
            <button type="button" className="bramer-footer-link-button" onClick={event=>openBeta(event,'register')}>{tr('베타 무료 체험','Free beta')}</button>
            <span className="bramer-footer-company">NINEWORKS · 박재영</span>
          </div>
        </div>
        <div className="bramer-footer-bottom"><div><BramerLogo light /><span>{tr('브랜드 가이드라인 제작 서비스','Brand guideline creation service')}</span></div><small>{tr('현재 제공되는 기능을 기준으로 안내합니다.','Features described reflect the current beta version.')}</small></div>
      </div>
    </footer>
    {betaOpen ? <div className="bramer-beta-overlay" onMouseDown={event => {if(event.target===event.currentTarget)closeBeta();}}>
      <div className="bramer-beta-dialog bramer-beta-refined" role="dialog" aria-modal="true" aria-labelledby="bramer-beta-title" aria-describedby="bramer-beta-description" ref={dialogRef} tabIndex={-1}>
        <button type="button" className="bramer-beta-close" aria-label={tr('닫기','Close')} onClick={closeBeta}>{tr('닫기','Close')}</button>
        <div className="bramer-beta-label">BRAMER BETA</div>
        {betaMode==='choice'?<>
          <h2 id="bramer-beta-title">{tr('브레이머를 시작해 볼까요?','Let’s get started with BRAMER.')}</h2>
          <p id="bramer-beta-description">{tr('새로운 가이드라인을 만들거나, 이 브라우저에 등록한 베타 정보를 이용해 다시 시작할 수 있습니다.','Create your first guideline or return using your beta registration on this browser.')}</p>
          <div className="bramer-beta-choice">
            <button type="button" onClick={()=>{setBetaError('');setBetaMode('register');}}><span><strong>{tr('새로 시작하기','Start new')}</strong><small>{tr('간단한 정보 등록 후 무료 체험','Register a few details to try it for free')}</small></span><span aria-hidden="true">→</span></button>
            <button type="button" onClick={()=>{setBetaError('');setBetaMode('login');}}><span><strong>{tr('베타테스트 로그인','Beta login')}</strong><small>{tr('등록한 성함과 연락처로 다시 시작','Return with your registered name and phone')}</small></span><span aria-hidden="true">→</span></button>
          </div>
          <p className="bramer-beta-footnote">{tr('베타 로그인은 현재 등록에 사용한 브라우저에서만 지원됩니다.','Beta login works only on the browser where you registered.')}</p>
        </>:betaMode==='login'?<>
          <h2 id="bramer-beta-title">{tr('베타테스트 로그인','Beta login')}</h2>
          <p id="bramer-beta-description">{tr('등록할 때 사용한 성함과 연락처를 입력해 주세요.','Enter the name and phone number used during registration.')}</p>
          <form className="bramer-beta-form bramer-auth-fields" onSubmit={tryLogin}>
            <div className="bramer-beta-field-grid">
              <label><span>{tr('성함','Name')}</span><input autoComplete="name" value={loginForm.name} maxLength={40} onChange={e=>setLoginForm(p=>({...p,name:e.target.value}))} required placeholder={tr('등록한 성함','Registered name')}/></label>
              <label><span>{tr('연락처','Phone number')}</span><input autoComplete="tel" type="tel" value={loginForm.phone} maxLength={20} onChange={e=>setLoginForm(p=>({...p,phone:e.target.value}))} required placeholder="010-1234-5678"/></label>
            </div>
            <p className="bramer-beta-local-notice">{tr('현재 서버 계정이 아닌 브라우저 내 베타 등록 정보 확인 방식입니다. 다른 기기에서는 로그인할 수 없습니다.','This checks beta registration saved in this browser, not a server account. Other devices are not supported.')}</p>
            {betaError?<p className="bramer-beta-error" role="alert">{betaError}</p>:null}
            <button type="submit" className="bramer-beta-primary" disabled={submitting}>{tr('로그인하고 계속하기','Login and continue')}</button>
          </form>
          <button type="button" className="bramer-beta-back" onClick={()=>{setBetaMode('choice');setBetaError('')}}>{tr('이전으로','Back')}</button>
        </>:<>
          <h2 id="bramer-beta-title">{tr('브레이머를 무료로 체험하세요.','Explore BRAMER for free.')}</h2>
          <p id="bramer-beta-description">{tr('성함과 연락처, 직업만 입력하면 시작할 수 있습니다. 처음 등록한 분께는 짧은 사용 안내가 제공됩니다.','Enter your name, phone number and occupation to begin. First-time registration includes a short introduction.')}</p>
          <form className="bramer-beta-form" onSubmit={tryBeta}>
            <div className="bramer-beta-field-grid">
              <label><span>{tr('성함','Name')}</span><input autoComplete="name" maxLength={40} value={betaForm.name} onChange={e=>setBetaForm(p=>({...p,name:e.target.value}))} placeholder={tr('성함을 입력해 주세요','Your name')} required/></label>
              <label><span>{tr('연락처','Phone number')}</span><input autoComplete="tel" type="tel" maxLength={20} value={betaForm.phone} onChange={e=>setBetaForm(p=>({...p,phone:e.target.value}))} placeholder="010-1234-5678" required/></label>
              <div className="bramer-occupation-field">
                <span className="bramer-occupation-label">{tr('직업','Occupation')}</span>
                <button type="button" className={'bramer-occupation-trigger'+(occupationOpen?' expanded':'')} aria-expanded={occupationOpen} aria-haspopup="listbox" onClick={()=>setOccupationOpen(v=>!v)}>{betaForm.occupation||tr('선택해 주세요','Select an occupation')}<span aria-hidden="true">⌄</span></button>
                {occupationOpen?<div className="bramer-occupation-list" role="listbox" aria-label={tr('직업 선택','Choose occupation')}>
                  {(['디자이너','기업 담당자','브랜드 운영자','학생·연구자','기타'] as const).map(v=><button role="option" aria-selected={betaForm.occupation===v} key={v} type="button" onClick={()=>{setBetaForm(p=>({...p,occupation:v}));setOccupationOpen(false)}}>{tr(v,({'디자이너':'Designer','기업 담당자':'Company representative','브랜드 운영자':'Brand manager','학생·연구자':'Student / researcher','기타':'Other'} as Record<string,string>)[v])}</button>)}
                </div>:null}
              </div>
            </div>
            <div className="bramer-beta-privacy">
              <label className="bramer-beta-consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} required/><span>{tr('개인정보 이용 안내에 동의합니다. (필수)','I agree to the privacy notice. (Required)')}</span></label>
              <button type="button" className="bramer-beta-privacy-button" aria-expanded={privacyOpen} onClick={()=>setPrivacyOpen(v=>!v)}>{tr('이용 안내','Privacy details')} {privacyOpen?tr('접기','Hide'):tr('보기','View')}</button>
              {privacyOpen?<div className="bramer-beta-privacy-text"><strong>{tr('베타 등록 및 보관 안내','Beta registration and storage')}</strong>
                <p>{tr('베타 신청을 위해 성함, 연락처, 직업을 수집하고 Firebase에 저장합니다. 운영 관리와 베타테스트 안내 및 문의 대응 목적으로 이용합니다.','We collect name, phone number, and occupation and store them in Firebase for beta registration, administration, support, and beta-related contact.')}</p>
                <p>{tr('입력한 성함·연락처·직업 원문은 BRAMER의 Firebase Firestore에 저장되어 승인된 관리자만 조회합니다. 이 브라우저에는 재방문을 확인하기 위한 해시 정보가 별도로 보관되며, 이름과 연락처 원문은 브라우저 인증 정보에 저장하지 않습니다.','Your name, phone, and occupation are stored in private Firebase Firestore records accessible only to authorized admins. A separate salted verification hash is kept in this browser for returning access.')}</p>
                <p>{tr('기본 보유기간은 베타 운영 종료 후 3개월이며, 별도 법령상 의무가 있는 경우를 제외하고 이후 삭제합니다. 삭제 문의는 NINEWORKS에 요청할 수 있습니다. 현재 로그인은 본인 인증이 아니며 동일 브라우저에서만 가능합니다.','Beta registration data is planned to be retained for three months after the beta ends, unless law requires otherwise. Deletion can be requested from NINEWORKS. Browser login is not identity verification or cross-device authentication.')}</p>
                <p>{tr('방문 통계는 Firebase의 익명 세션을 활용해 날짜별 방문 횟수를 집계합니다. BRAMER의 방문 집계 문서에는 성함·연락처·IP 주소를 저장하지 않으며, 브라우저에 집계 중복 방지를 위한 세션 정보가 저장될 수 있습니다.','Visit counts use anonymous Firebase sessions and daily aggregates. BRAMER does not store names, phone numbers or IP addresses in visitor count documents. Browser session data is used to reduce duplicate counts.')}</p>
              </div>:null}
            </div>
            <p className="bramer-beta-local-notice">{tr('신청 정보는 Firebase에 저장되며, 베타 로그인은 등록한 브라우저에서만 지원됩니다.','Registration details are stored in Firebase. Beta login remains limited to this browser.')}</p>
            {betaError?<p className="bramer-beta-error" role="alert">{betaError}</p>:null}
            <button type="submit" className="bramer-beta-primary" disabled={submitting}>{tr('등록하고 무료 체험하기','Register and start free trial')}</button>
          </form>
          <button type="button" className="bramer-beta-back" onClick={()=>{setBetaMode('choice');setBetaError('')}}>{tr('이전으로','Back')}</button>
        </>}
      </div>
    </div> : null}
  </div>;
}
