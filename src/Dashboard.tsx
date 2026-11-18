import { useState, type ChangeEvent } from 'react';
import BramerSelect from './components/BramerSelect';
import WorkspaceNav from './components/WorkspaceNav';
import { INDUSTRY_PRIORITIES } from './engines/industryPriorities';
import { INDUSTRY_RATIONALE } from './engines/industryRationale';
import { CATEGORIES, INDUSTRIES, INDUSTRY_GUIDANCE, getRecommendations, type IndustryId } from './engines/industryRecommendations';

type DashboardProps = {
  view: 'dashboard' | 'guide';
  onNavigate: (view: 'dashboard' | 'guide') => void;
  onProjects: () => void;
  onHelp: () => void;
  onHome: () => void;
  onCreate: (industry?: IndustryId) => void;
  onContinue: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  currentProject?: string;
  currentIndustry?: IndustryId;
};

const commonDocuments = ['브랜드명 · 영문명', 'SVG 로고 파일', '브랜드 소개 및 슬로건', '브랜드 컬러', '제목·본문 서체', '담당자 연락처(명함)', '회사 정보·주소(서식·봉투)'];
const documents: Record<IndustryId, string[]> = Object.fromEntries(INDUSTRIES.map(item=>[item.id, commonDocuments])) as Record<IndustryId,string[]>;

const names: Record<string,string> = {
  overview:'브랜드 소개',logo:'로고 사용 규칙',color:'컬러 규칙',typography:'서체와 텍스트',
  verbal:'브랜드 메시지',application:'명함·스티커·문서 응용',
};

export default function Dashboard({view,onNavigate,onHome,onCreate,onContinue,onImport,onProjects,onHelp,currentProject,currentIndustry}:DashboardProps) {
  const [industry,setIndustry] = useState<IndustryId>(currentIndustry ?? 'beauty');
  const [checked,setChecked] = useState<Record<string,boolean>>({});
  const [search,setSearch] = useState('');
  const recommendation = getRecommendations(industry);
  const industryLabel = INDUSTRIES.find(item=>item.id===industry)?.label ?? '';
  const recommended = CATEGORIES.filter(item=>recommendation[item.id]!=='Extended');
  const selectedDocs = documents[industry].filter(item=>item.toLowerCase().includes(search.toLowerCase()));
  const priorities = INDUSTRY_PRIORITIES[industry];
  return <div className="bramer-dash">
    <header className="bramer-dash-header">
      <button className="bramer-dash-logo" onClick={onHome} type="button" aria-label="Bramer 랜딩페이지로 이동">BRAMER.</button>
      <span className="bramer-dash-product">브랜드 가이드라인 제작</span>
      <button className="bramer-dash-header-start" onClick={()=>onCreate()} type="button">새 가이드라인 만들기</button>
    </header>
    <div className="bramer-dash-layout">
      <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
        <WorkspaceNav active={view==='guide'?'guide':'home'} onHome={onHome} onProjects={onProjects} onGuide={()=>onNavigate('guide')} onHelp={onHelp} onNew={()=>onCreate()}/>
        <div className="bramer-dash-sidebar-bottom">
          <p>처음 만드는 브랜드 가이드라인도 필요한 항목부터 차근차근 구성해 보세요.</p>
          <button type="button" onClick={onHome}>서비스 소개 보기</button>
        </div>
      </aside>
      <main className="bramer-dash-content">
        {view==='dashboard' ? <>
          <div className="bramer-dash-welcome">
            <p className="bramer-dash-eyebrow">Bramer Workspace</p>
            <h1>브랜드 가이드라인을 만들어볼까요?</h1>
            <p>로고를 등록하고, 브랜드에 필요한 규칙을 골라 나만의 가이드라인을 완성해보세요.</p>
            <button type="button" className="bramer-dash-primary" onClick={()=>onCreate()}>새 가이드라인 만들기</button>
          </div>
          <section className="bramer-dash-section">
            <h2>무엇을 도와드릴까요?</h2>
            <div className="bramer-dash-action-grid">
              <button type="button" onClick={()=>onCreate()}><span className="bramer-dash-action-visual">B.</span><strong>처음부터 만들기</strong><small>브랜드 정보와 로고를 등록해 시작하세요.</small></button>
              <button type="button" onClick={()=>onNavigate('guide')}><span className="bramer-dash-action-visual light">Aa</span><strong>업종별 가이드 살펴보기</strong><small>필요한 항목과 준비 자료를 확인하세요.</small></button>
              <label className="bramer-dash-action-upload"><input type="file" accept=".json,application/json" onChange={onImport}/><span className="bramer-dash-action-visual neutral">파일</span><strong>프로젝트 불러오기</strong><small>JSON 파일을 복원하거나 내 프로젝트에서 기존 작업을 확인하세요.</small></label>
            </div>
          </section>
          {currentProject ? <section className="bramer-dash-section"><h2>진행 중인 작업</h2><div className="bramer-dash-current"><div><span>현재 세션</span><strong>{currentProject}</strong><p>이 브라우저에서 진행 중인 가이드라인입니다. 내 프로젝트에서 이어서 작업하거나 JSON 파일로 별도 백업할 수 있어요.</p></div><button type="button" onClick={onContinue}>이어서 작업</button></div></section> : null}
          <section className="bramer-dash-section"><h2>업종별로 살펴보기</h2><div className="bramer-dash-industries">{INDUSTRIES.map(item=><button key={item.id} type="button" onClick={()=>{setIndustry(item.id);setChecked({});onNavigate('guide')}}>{item.label}</button>)}</div></section>
        </> : <>
          <div className="bramer-dash-page-title">
            <p className="bramer-dash-eyebrow">업종별 브랜드 가이드</p>
            <h1>우리 브랜드에는 어떤 기준이 필요할까요?</h1>
            <p>모든 업종에서 제공되는 17개 제작 항목과 필요한 입력 정보를 확인해보세요. 업종 정보는 참고용으로 활용됩니다.</p>
          </div>
          <section className="bramer-dash-section bramer-guide-content">
            <div className="bramer-guide-select"><span>브랜드 업종</span>
              <BramerSelect ariaLabel="브랜드 업종 선택" value={industry} options={INDUSTRIES.map(item => ({ value: item.id, label: item.label }))} onChange={value => { setIndustry(value as IndustryId); setChecked({}); setSearch(''); }}/>
            </div>
            <div className="bramer-guide-overview">
              <h2>{industryLabel}</h2>
              <p>{priorities.context}</p>
              <div>{INDUSTRY_GUIDANCE[industry].touchpoints.map(point=><span key={point}>{point}</span>)}</div>
            </div>
            <div className="bramer-industry-research-disclaimer" role="note">
              아래 우선순위는 업종별 사용 환경과 제작 가능성을 참고한 실무적 제안입니다. 진행 중인 22개 브랜드 사례 분석에서 통계적으로 검증된 ‘업종별 필수 표준’은 아닙니다. BRAMER의 기본 결과물 17개 항목은 모든 업종에 동일하게 적용돼요.
            </div>
            <section className="bramer-industry-priorities" aria-label="업종별 우선 검토 항목">
              <div className="bramer-industry-section-heading">
                <h3>이 업종에서 특히 확인할 규칙</h3>
                <p>제작 시 우선 검토를 권장하는 항목과 그 이유</p>
              </div>
              <div className="bramer-industry-priority-grid">
                {priorities.important.map((item,index)=><article key={item.title}>
                  <span>{String(index+1).padStart(2,'0')}</span>
                  <h4>{item.title}</h4>
                  <p>{item.why}</p>
                  <small>관련 제작 항목: {item.output}</small>
                </article>)}
              </div>
            </section>
            <div className="bramer-industry-guidance-columns">
              <section className="bramer-industry-guidance-panel">
                <h3>운영 환경에 따라 선택적으로 활용</h3>
                <p className="bramer-industry-guidance-intro">기본 17개 구성에 포함되어 있지만, 업종·운영 환경에 따라 활용 우선순위가 다를 수 있어요.</p>
                {priorities.optional.map(item=><div className="bramer-industry-guidance-row" key={item.title}><strong>{item.title}</strong><p>{item.condition}</p></div>)}
              </section>
              <section className="bramer-industry-guidance-panel">
                <h3>별도 자료·전문 검토가 필요한 영역</h3>
                <p className="bramer-industry-guidance-intro">SVG와 기본 텍스트만으로 완성된 브랜드 규정으로 생성하지 않는 영역입니다.</p>
                {priorities.beyond.map(item=><div className="bramer-industry-guidance-row" key={item.title}><strong>{item.title}</strong><p>{item.reason}</p></div>)}
              </section>
            </div>
            <section className="bramer-industry-final-check">
              <h3>제작 전 확인 질문</h3>
              <div>{priorities.check.map((question,index)=><p key={question}><span>{String(index+1).padStart(2,'0')}</span>{question}</p>)}</div>
            </section>
            <div className="bramer-guide-columns">
              <div>
                <h3>공통 기본 시스템 · 17개 항목</h3>
                <div className="bramer-guide-items">{recommended.map(item=><div key={item.id}><div><strong>{names[item.id]}</strong><small>{item.description}</small></div><span>기본</span></div>)}</div>
                <p className="bramer-guide-footnote">여섯 분류 아래 17개 세부 제작 항목을 제공합니다. 별도의 사진·모션·제품 라벨을 자동 생성하지 않습니다.</p>
              </div>
              <div>
                <div className="bramer-guide-doc-head"><h3>준비할 자료</h3><span>{documents[industry].filter(item=>checked[item]).length}/{documents[industry].length}</span></div>
                <input className="bramer-guide-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="자료 검색" aria-label="준비할 자료 검색"/>
                <div className="bramer-guide-checklist">{selectedDocs.map(item=><label key={item}><input type="checkbox" checked={Boolean(checked[item])} onChange={e=>setChecked(p=>({...p,[item]:e.target.checked}))}/><span><strong>{item}</strong><small>{item==='SVG 로고 파일'?'원본 로고의 비율·색상을 분석합니다.':item==='브랜드 소개 및 슬로건'?'사용자가 입력한 공식 브랜드 내용을 적용합니다.':item==='담당자 연락처(명함)'?'명함 뒷면과 연락처에 반영합니다.':item==='회사 정보·주소(서식·봉투)'?'레터헤드·봉투의 기본 정보에 사용합니다.':'가이드라인의 기본 데이터로 사용합니다.'}</small></span></label>)}</div>
                <p className="bramer-guide-footnote">체크한 준비 상태는 이 안내 화면에서만 표시되며, 실제 제작 정보는 제작 화면에서 입력합니다.</p>
              </div>
            </div>
            <div className="bramer-guide-bottom"><button className="bramer-dash-primary" type="button" onClick={()=>onCreate(industry)}>이 업종으로 만들기</button></div>
          </section>
        </>}
      </main>
    </div>
  </div>;
}
