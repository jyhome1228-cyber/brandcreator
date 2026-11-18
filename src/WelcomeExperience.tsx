import { useEffect, useState } from 'react';

type WelcomeExperienceProps = { onFinish: () => void; english: boolean };
const steps = [
  { index:'01', title:'브랜드의 기본 정보를 등록합니다.', english:'Add your brand details.', body:'브랜드명과 SVG 로고, 컬러와 서체를 입력해 주세요. 처음부터 모든 내용을 완성하지 않아도 괜찮습니다.', enBody:'Enter your brand name, SVG logo, colors, and typography. You can refine your information as you go.' },
  { index:'02', title:'가이드라인의 기준을 확인합니다.', english:'Review your brand standards.', body:'로고의 비례와 여백, 최소 크기 등 자동 제안된 내용을 살펴보고 브랜드에 맞게 조정합니다.', enBody:'Review suggested logo proportions, clear space, and minimum size, then adapt them to your brand.' },
  { index:'03', title:'하나의 문서로 정리하고 전달합니다.', english:'Create and share your guideline.', body:'17개 기본 항목을 확인하고, 명함과 서식을 포함한 결과물을 SVG 또는 PDF로 내보낼 수 있습니다.', enBody:'Review 17 core items, including stationery, and export your guideline as SVG or PDF.' },
];

export default function WelcomeExperience({onFinish,english}:WelcomeExperienceProps) {
 const [step,setStep] = useState(0);
 const [logoStage,setLogoStage] = useState(false);
 useEffect(()=>{
   if (!logoStage) return;
   const timer=window.setTimeout(onFinish,1400);
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
 return <main className="bramer-welcome" aria-label={english?'BRAMER introduction':'BRAMER 시작 안내'}>
   <header className="bramer-welcome-header"><strong>BRAMER.</strong><button type="button" onClick={onFinish}>{english?'Skip introduction':'건너뛰기'}</button></header>
   {logoStage?<section className="bramer-welcome-mark" aria-live="polite">
     <strong>BRAMER.</strong><p>{english?'Your brand standards begin here.':'브랜드의 기준을 만드는 새로운 시작.'}</p>
   </section>:<section className="bramer-welcome-body" key={step}>
     <p className="bramer-welcome-eyebrow">{step===0?'WELCOME TO BRAMER':'HOW BRAMER WORKS'}</p>
     {step===0?<>
       <h1>{english?'Hello, welcome to BRAMER.':'안녕하세요.\n브레이머를 소개합니다.'}</h1>
       <p className="bramer-welcome-description">{english?'BRAMER turns your brand assets into a practical guideline. Define how your logo, color, typography, and applications should work together, and share your brand standards with clarity.':'브레이머는 완성된 로고가 브랜드의 모든 접점에서 일관되게 사용되도록 돕는 가이드라인 제작 솔루션입니다. 로고의 사용 규칙부터 컬러, 서체, 명함과 서식까지 브랜드에 필요한 기준을 체계적인 문서로 정리해 보세요.'}</p>
       <div className="bramer-welcome-caption">{english?'A clear process, from logo to guideline.':'복잡한 제작 과정은 줄이고, 브랜드의 기준은 더 명확하게.'}</div>
     </>:<>
       <h1>{english?'Three simple steps to begin.':'세 단계로 간단하게\n시작할 수 있습니다.'}</h1>
       <div className="bramer-welcome-steps">{steps.map(item=><article key={item.index}><span>{item.index}</span><div><h2>{english?item.english:item.title}</h2><p>{english?item.enBody:item.body}</p></div></article>)}</div>
     </>}
     <div className="bramer-welcome-bottom"><span>{String(step+1).padStart(2,'0')} / 02</span><button type="button" className="bramer-welcome-next" onClick={next}>{step===0?(english?'See how it works':'사용 방법 알아보기'):(english?'Start BRAMER':'이제 시작합니다')}<span aria-hidden="true">→</span></button></div>
   </section>}
 </main>;
}
