import { useEffect, useRef, useState, type PointerEvent } from 'react';

type WelcomeExperienceProps = { onFinish: () => void; english: boolean };
const steps = [
  { index:'01', title:'브랜드의 기본 정보를 등록합니다.', english:'Add your brand details.', body:'브랜드명과 SVG 로고, 컬러와 서체를 입력해 주세요. 처음부터 모든 내용을 완성하지 않아도 괜찮습니다.', enBody:'Enter your brand name, SVG logo, colors, and typography. You can refine your information as you go.' },
  { index:'02', title:'가이드라인의 기준을 확인합니다.', english:'Review your brand standards.', body:'로고의 비례와 여백, 최소 크기 등 자동 제안된 내용을 살펴보고 브랜드에 맞게 조정합니다.', enBody:'Review suggested logo proportions, clear space, and minimum size, then adapt them to your brand.' },
  { index:'03', title:'하나의 문서로 정리하고 전달합니다.', english:'Create and share your guideline.', body:'17개 기본 항목을 확인하고, 명함과 서식을 포함한 결과물을 SVG 또는 PDF로 내보낼 수 있습니다.', enBody:'Review 17 core items, including stationery, and export your guideline as SVG or PDF.' },
];

export default function WelcomeExperience({onFinish,english}:WelcomeExperienceProps) {
 const [step,setStep] = useState(0);
 const [logoStage,setLogoStage] = useState(false);
 const surfaceRef = useRef<HTMLElement>(null);
 const onSurfaceMove = (event:PointerEvent<HTMLElement>) => {
   if(event.pointerType==='touch')return;
   const node=surfaceRef.current;
   if(!node)return;
   const bounds=node.getBoundingClientRect();
   node.style.setProperty('--welcome-pointer-x',`${((event.clientX-bounds.left)/bounds.width*100).toFixed(2)}%`);
   node.style.setProperty('--welcome-pointer-y',`${((event.clientY-bounds.top)/bounds.height*100).toFixed(2)}%`);
   node.style.setProperty('--welcome-shift-x',`${((event.clientX-bounds.left-bounds.width/2)/bounds.width*9).toFixed(2)}px`);
   node.style.setProperty('--welcome-shift-y',`${((event.clientY-bounds.top-bounds.height/2)/bounds.height*9).toFixed(2)}px`);
 };
 const resetSurface = () => {
   const node=surfaceRef.current;
   if(!node)return;
   node.style.setProperty('--welcome-pointer-x','50%');
   node.style.setProperty('--welcome-pointer-y','50%');
   node.style.setProperty('--welcome-shift-x','0px');
   node.style.setProperty('--welcome-shift-y','0px');
 };
 useEffect(()=>{
   if (!logoStage) return;
   const timer=window.setTimeout(onFinish,1250);
   return ()=>window.clearTimeout(timer);
 },[logoStage,onFinish]);
 useEffect(()=>{
   const handler=(event:KeyboardEvent)=>{
     if(event.key==='Escape')onFinish();
     if(event.key==='ArrowRight' && !logoStage)setStep(v=>Math.min(1,v+1));
     if(event.key==='ArrowLeft' && !logoStage)setStep(v=>Math.max(0,v-1));
   };
   document.addEventListener('keydown',handler);
   return ()=>document.removeEventListener('keydown',handler);
 },[logoStage,onFinish]);
 const next=()=>{if(step===0)setStep(1);else setLogoStage(true);};
 return <main className="bramer-welcome" ref={surfaceRef} onPointerMove={onSurfaceMove} onPointerLeave={resetSurface} aria-label={english?'BRAMER introduction':'BRAMER 시작 안내'}>
   <header className="bramer-welcome-header"><strong>BRAMER.</strong><button type="button" onClick={onFinish}>{english?'Skip introduction':'건너뛰기'}</button></header>
   {logoStage?<section className="bramer-welcome-mark" aria-live="polite">
     <img src={window.location.pathname.startsWith("/brandcreator/") ? "/brandcreator/bramer-sample-logo.svg" : "/bramer-sample-logo.svg"} alt="BRAMER" />
     <p>{english?'Your brand standards begin here.':'브랜드의 기준을 만드는 새로운 시작.'}</p>
   </section>:<section className={'bramer-welcome-body bramer-welcome-step-'+step} key={step}>
     <p className="bramer-welcome-eyebrow">{step===0?'WELCOME TO BRAMER':'HOW BRAMER WORKS'}</p>
     {step===0?<div className="bramer-welcome-introduction">
       <h1>{english?'Hello, welcome to BRAMER.':'안녕하세요. 브레이머를 소개합니다.'}</h1>
       <p className="bramer-welcome-description">{english?'BRAMER helps you create clear, consistent brand guidelines. Organize your logo usage, colors, typography, and applications into one practical document.':'브레이머는 로고부터 컬러, 서체, 응용 디자인까지 브랜드의 기준을 하나의 문서로 정리합니다. 필요한 정보를 입력하고 사용 규칙을 확인한 뒤, 완성된 가이드라인을 간편하게 제작해 보세요.'}</p>
     </div>:<div className="bramer-welcome-walkthrough">
       <h1>{english?'Three simple steps to begin.':'세 단계로 간단하게 시작하세요.'}</h1>
       <div className="bramer-welcome-steps">
         {steps.map((item,i)=><article key={item.index} className="bramer-welcome-step-card">
           <span className="bramer-welcome-step-symbol" aria-hidden="true">
           {i===0?<svg viewBox="0 0 48 48" fill="none"><rect x="9" y="11" width="30" height="26" rx="5" stroke="currentColor" strokeWidth="1.5"/><path d="M15 20H33M15 26H27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>:
           i===1?<svg viewBox="0 0 48 48" fill="none"><rect x="11" y="11" width="26" height="26" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M24 8V40M8 24H40M15 15L33 33" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>:
           <svg viewBox="0 0 48 48" fill="none"><path d="M12 11H31L36 16V37H12V11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M29 11V18H36M18 25H30M18 30H27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
           </span>
           <span className="bramer-welcome-step-number">{item.index}</span>
           <h2>{english?item.english:item.title}</h2>
           <p>{english?item.enBody:item.body}</p>
         </article>)}
       </div>
     </div>}
     <div className="bramer-welcome-bottom">
       <button type="button" className="bramer-welcome-next" onClick={next}>{step===0?(english?'See how it works':'사용 방법 알아보기'):(english?'Start BRAMER':'이제 시작합니다')}<span aria-hidden="true">→</span></button>
     </div>
   </section>}
 </main>;
}
