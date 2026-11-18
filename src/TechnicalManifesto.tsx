import {useEffect, useState} from 'react';
import BramerLogo from './components/BramerLogo';

type Props={onHome:()=>void;onBeta:()=>void; english?:boolean};
const chapters=[
 {id:'overview',label:'BRAMER 소개'},
 {id:'principles',label:'설계 원칙'},
 {id:'architecture',label:'기술 구조'},
 {id:'workflow',label:'제작 프로세스'},
 {id:'outputs',label:'17개 제작 항목'},
 {id:'verification',label:'검증과 한계'},
 {id:'privacy',label:'데이터와 베타 운영'},
 {id:'credits',label:'운영 정보'},
] as const;
const core=[['Logo System','기본 로고, 그리드, 보호 공간, 최소 크기, 사용 금지, 흑백 버전'],
 ['Color System','브랜드 지정 컬러, 컬러 조합, 대비 및 적용 검토'],
 ['Typography','제목·본문 서체와 정보 위계'],
 ['Brand Expression','브랜드 소개와 공식 슬로건, 핵심 메시지'],
 ['Applications','명함, 스티커, A4 서식, 소봉투·대봉투']];
export default function TechnicalManifesto({onHome,onBeta}:Props){
 const [active,setActive]=useState('overview');
 useEffect(()=>{
   const observer=new IntersectionObserver(entries=>{
     entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top).forEach(e=>setActive(e.target.id));
   },{rootMargin:'-16% 0px -66% 0px'});
   chapters.forEach(item=>{const el=document.getElementById(item.id);if(el)observer.observe(el)});
   return ()=>observer.disconnect();
 },[]);
 return <div className="bramer-docs">
   <header className="bramer-docs-header">
     <button className="bramer-docs-wordmark" type="button" onClick={onHome} aria-label="BRAMER 홈"><BramerLogo/></button>
     <div className="bramer-docs-head-actions"><span>BRAMER DOCUMENTATION</span><button type="button" className="bramer-docs-cta" onClick={onBeta}>베타 시작하기</button></div>
   </header>
   <div className="bramer-docs-shell">
     <aside className="bramer-docs-sidebar" aria-label="문서 목차">
       <div className="bramer-docs-side-head"><strong>BRAMER 기술 소개</strong></div>
       <nav>{chapters.map(item=><a key={item.id} href={'#'+item.id} className={active===item.id?'active':''} onClick={event=>{event.preventDefault();document.getElementById(item.id)?.scrollIntoView({behavior:'smooth',block:'start'});setActive(item.id);}}>{item.label}</a>)}</nav>
       <div className="bramer-docs-side-bottom"><p>From Logo to Brand Standards.</p><button type="button" onClick={onHome}>홈페이지로 돌아가기</button></div>
     </aside>
     <main className="bramer-docs-main">
       <section id="overview" className="bramer-docs-hero">
         <div className="bramer-docs-kicker">BRAMER · BRAND GUIDELINE SYSTEM</div>
         <h1>브랜드의 기준을,<br/>더 명확하게.</h1>
         <p className="bramer-docs-lead">하나의 로고에서 일관된 브랜드 경험까지. BRAMER는 브랜드가 만들어진 이후의 운영 기준을 정리하는 디자인 도구입니다.</p>
         <p>원본 SVG에서 브랜드의 사용 규칙을 구성하고, 명함과 서식까지 하나의 시스템으로 연결합니다. 설계의 기준은 분명하게, 제작 과정은 단순하게.</p>
         <div className="bramer-docs-metrics"><div><strong>17</strong><span>기본 제작 항목</span></div><div><strong>26</strong><span>현재 구성 페이지</span></div><div><strong>SVG / PDF</strong><span>주요 결과물 형식</span></div></div>
       </section>
       <section id="principles" className="bramer-docs-section">
         <span className="bramer-docs-section-number">02 · PRINCIPLES</span><h2>시스템을 설계하는 네 가지 원칙</h2>
         <div className="bramer-docs-principles">
           <article><span>01</span><h3>정확한 원본</h3><p>브랜드의 출발점은 승인된 로고입니다. 원본 SVG의 형태와 비례를 우선하며, 임의로 로고를 다시 그리거나 새로운 그래픽으로 대체하지 않습니다.</p></article>
           <article><span>02</span><h3>설명 가능한 규칙</h3><p>보호 공간과 최소 크기처럼 계산 가능한 값은 근거를 드러내되, 자동 제안값과 최종 승인 규정을 명확히 구분합니다.</p></article>
           <article><span>03</span><h3>일관된 결과물</h3><p>로고 시스템부터 명함과 공식 서식까지 같은 데이터와 기준을 사용해 문서 내부의 연결성을 높입니다.</p></article>
           <article><span>04</span><h3>검토 가능한 자동화</h3><p>반복 작업을 줄이는 것이 목적이지만, 최종 브랜드 판단은 디자이너와 운영자에게 남겨 둡니다.</p></article>
         </div>
       </section>
       <section id="architecture" className="bramer-docs-section">
         <span className="bramer-docs-section-number">03 · TECHNOLOGY</span><h2>SVG를 읽고, 규칙으로 구조화하고, 문서로 출력합니다.</h2>
         <p>BRAMER의 현재 베타는 브라우저에서 SVG 로고와 브랜드 정보를 입력받아 가이드라인을 구성합니다. SVG는 형태와 크기를 표현할 수 있는 벡터 형식이기 때문에 로고의 원본 비례를 유지한 채 다양한 출력 환경으로 확장하기에 적합합니다.</p>
         <div className="bramer-docs-flow"><div><span>INPUT</span><strong>SVG 로고와 브랜드 정보</strong><small>브랜드명 · 컬러 · 서체 · 메시지</small></div><div><span>ANALYSIS</span><strong>구조와 시각 속성 분석</strong><small>시각 영역 · 비례 · 컬러 · 복잡도</small></div><div><span>RULES</span><strong>가이드라인 규칙 구성</strong><small>보호 공간 · 최소 크기 · 응용 기준</small></div><div><span>OUTPUT</span><strong>문서화 및 내보내기</strong><small>페이지별 SVG · PDF</small></div></div>
         <h3>로고 분석과 사용자 설정</h3><p>업로드한 SVG의 기본 구조와 시각적 영역을 확인하고, 로고 높이를 기준으로 비례 및 보호 공간을 표현합니다. 자동으로 제안되는 값은 제작을 돕기 위한 출발점으로 제공되며, 승인된 브랜드의 규정이나 인쇄소 사양을 대체하지 않습니다.</p>
         <h3>언어와 문서의 관계</h3><p>홈페이지 언어와 결과물 언어는 구분됩니다. 가이드라인의 기본 항목명 및 고정 안내 문구는 국문·영문 전환을 지원하지만, 브랜드 소개와 슬로건처럼 사용자가 직접 입력한 고유 문구를 임의 번역하지는 않습니다.</p>
       </section>
       <section id="workflow" className="bramer-docs-section">
         <span className="bramer-docs-section-number">04 · WORKFLOW</span><h2>브랜드 정보에서 운영 가이드까지 이어지는 제작 흐름</h2>
         <div className="bramer-docs-list">
           <div><b>01</b><div><h3>브랜드 정보 정의</h3><p>브랜드명과 영문명, 설명과 슬로건, 컬러와 서체를 입력합니다. 입력하지 않은 고유 브랜드 정보를 시스템이 임의로 확정하지 않습니다.</p></div></div>
           <div><b>02</b><div><h3>SVG 원본 등록 및 분석</h3><p>벡터 로고를 업로드하고 시각 영역, 비율과 주요 컬러를 확인합니다. Illustrator AI 원본 파일은 SVG로 저장한 뒤 업로드해야 합니다.</p></div></div>
           <div><b>03</b><div><h3>사용 규칙 검토</h3><p>자동 제안값과 업종별 참고 사항을 살펴보고 로고의 최소 크기와 보호 공간을 실무 환경에 맞게 조정합니다.</p></div></div>
           <div><b>04</b><div><h3>응용 디자인과 정보 입력</h3><p>명함, 서식, 봉투에 들어갈 담당자 및 조직 정보를 입력합니다. 출력 규격은 제공되지만 인쇄용 도련과 전개도는 별도로 확인해야 합니다.</p></div></div>
           <div><b>05</b><div><h3>문서 검토·전달</h3><p>생성된 페이지를 살펴보고 SVG와 PDF로 결과물을 내보냅니다. 편집 가능성과 실제 인쇄 적합성은 별도 검수 항목입니다.</p></div></div>
         </div>
       </section>
       <section id="outputs" className="bramer-docs-section">
         <span className="bramer-docs-section-number">05 · DELIVERABLES</span><h2>브랜드 운영에 필요한 17개 기본 항목</h2>
         <p>BRAMER는 서로 다른 항목을 단절된 템플릿으로 처리하지 않습니다. 로고 데이터와 브랜드 기본 정보를 공유하는 하나의 문서 구조 안에서 사용 원칙과 응용 예시를 함께 구성합니다. 현재 베타에서는 17개 기본 제작 항목을 26페이지의 가이드라인으로 표현합니다.</p>
         <div className="bramer-docs-output-list">{core.map(([title,description])=><div key={title}><strong>{title}</strong><span>{description}</span></div>)}</div>
       </section>
       <section id="verification" className="bramer-docs-section">
         <span className="bramer-docs-section-number">06 · QUALITY & LIMITATIONS</span><h2>자동 생성과 최종 승인 사이에는 검증 과정이 필요합니다.</h2>
         <p>BRAMER가 제공하는 결과물은 브랜드 가이드라인 제작을 위한 기준 초안과 시각적 예시입니다. 로고의 광학적 정렬, 획의 가독성, 복잡한 배경에서의 시인성, 법적 표기와 인쇄 매체의 재현 특성까지 자동으로 확정할 수는 없습니다.</p>
         <p>명함은 90×50mm, A4 서식은 210×297mm, 소봉투와 대봉투는 각각 220×105mm와 330×245mm의 외형 예시를 제공합니다. 실제 제작 전에는 인쇄소별 칼선·접착 플랩·도련·안전 여백과 글꼴을 확인해야 합니다. 현재 출력용 SVG는 디자인과 정보 배치를 검토하기 위한 자료이며, 모든 매체에 그대로 인쇄할 수 있는 제작 승인본을 의미하지 않습니다.</p>
         <div className="bramer-docs-notice"><strong>실무 검토 안내</strong><p>자동 분석 결과와 업종별 권장 항목은 검토를 돕는 참고 자료입니다. 현재 시스템을 공인된 BI 표준이나 검증된 품질 인증 도구로 소개하지 않습니다.</p></div>
       </section>
       <section id="privacy" className="bramer-docs-section">
         <span className="bramer-docs-section-number">07 · DATA & BETA</span><h2>현재의 저장 방식과 베타 이용 조건을 명확히 안내합니다.</h2>
         <p>브랜드 프로젝트는 현재 사용 중인 브라우저의 로컬 저장 영역에 보관됩니다. 따라서 기기 또는 브라우저를 변경하거나 사이트 데이터를 삭제하면 이전 자료를 다시 사용할 수 없을 수 있습니다. 중앙 계정 저장 및 여러 기기 간 자동 동기화는 제공되지 않습니다.</p>
         <p>베타 이용 정보는 성함과 연락처 조합의 확인값을 현재 브라우저에 저장하는 방식으로 사용됩니다. 이는 서버 기반 회원 인증이나 휴대전화 본인 확인이 아니며, 동일 브라우저에서만 재진입을 돕습니다. 중요한 자료는 출력한 파일을 별도로 관리하는 것이 좋습니다.</p>
       </section>
       <section id="credits" className="bramer-docs-section bramer-docs-credit">
         <span className="bramer-docs-section-number">09 · CREATOR</span><h2>BRAMER를 설계하고 운영하는 사람들</h2>
         <dl><div><dt>제작·운영</dt><dd>NINEWORKS · 나인웍스</dd></div><div><dt>대표자</dt><dd>박재영</dd></div><div><dt>서비스</dt><dd>BRAMER · 브랜드 가이드라인 제작 솔루션</dd></div><div><dt>현재 단계</dt><dd>Beta</dd></div></dl>
         <p>브랜드의 언어와 디자인의 규칙을 일회성 결과물이 아닌 지속 가능한 운영 체계로 연결하는 것이 BRAMER가 지향하는 방향입니다.</p>
         <div className="bramer-docs-end"><strong>From Logo to Brand Standards.</strong><button type="button" onClick={onBeta}>BRAMER 베타 시작하기</button></div>
       </section>
       <footer className="bramer-docs-footer"><span>© 2026 NINEWORKS · BRAMER</span><button type="button" onClick={onHome}>홈페이지로 돌아가기</button></footer>
     </main>
   </div>
 </div>;
}
