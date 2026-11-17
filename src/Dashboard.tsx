import { useState, type ChangeEvent } from 'react';
import BramerSelect from './components/BramerSelect';
import { INDUSTRY_RATIONALE } from './engines/industryRationale';
import { CATEGORIES, INDUSTRIES, INDUSTRY_GUIDANCE, getRecommendations, type IndustryId } from './engines/industryRecommendations';

type DashboardProps = {
  view: 'dashboard' | 'guide';
  onNavigate: (view: 'dashboard' | 'guide') => void;
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

export default function Dashboard({view,onNavigate,onHome,onCreate,onContinue,onImport,currentProject,currentIndustry}:DashboardProps) {
  const [industry,setIndustry] = useState<IndustryId>(currentIndustry ?? 'beauty');
  const [checked,setChecked] = useState<Record<string,boolean>>({});
  const [search,setSearch] = useState('');
  const recommendation = getRecommendations(industry);
  const industryLabel = INDUSTRIES.find(item=>item.id===industry)?.label ?? '';
  const recommended = CATEGORIES.filter(item=>recommendation[item.id]!=='Extended');
  const selectedDocs = documents[industry].filter(item=>item.toLowerCase().includes(search.toLowerCase()));
  return <div className="bramer-dash">
    <header className="bramer-dash-header">
      <button className="bramer-dash-logo" onClick={onHome} type="button" aria-label="Bramer 랜딩페이지로 이동">BRAMER.</button>
      <span className="bramer-dash-product">브랜드 가이드라인 제작</span>
      <button className="bramer-dash-header-start" onClick={()=>onCreate()} type="button">새 가이드라인 만들기</button>
    </header>
    <div className="bramer-dash-layout">
      <aside className="bramer-dash-sidebar" aria-label="서비스 메뉴">
        <div className="bramer-dash-nav">
          <button type="button" className={view==='dashboard'?'active':''} aria-current={view==='dashboard'?'page':undefined} onClick={()=>onNavigate('dashboard')}>홈</button>
          <button type="button" className={view==='guide'?'active':''} aria-current={view==='guide'?'page':undefined} onClick={()=>onNavigate('guide')}>업종별 가이드</button>
          <button type="button" onClick={()=>onCreate()}>새로 만들기</button>
        </div>
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
              <label className="bramer-dash-action-upload"><input type="file" accept=".json,application/json" onChange={onImport}/><span className="bramer-dash-action-visual neutral">파일</span><strong>프로젝트 불러오기</strong><small>이전에 저장한 프로젝트 파일로 이어서 작업하세요.</small></label>
            </div>
          </section>
          {currentProject ? <section className="bramer-dash-section"><h2>진행 중인 작업</h2><div className="bramer-dash-current"><div><span>현재 세션</span><strong>{currentProject}</strong><p>이 브라우저에서 진행 중인 가이드라인입니다. 파일로 저장하면 이후에도 이어서 작업할 수 있어요.</p></div><button type="button" onClick={onContinue}>이어서 작업</button></div></section> : null}
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
            <div className="bramer-guide-overview"><h2>{industryLabel}</h2><p>{INDUSTRY_RATIONALE[industry].why}</p><div>{INDUSTRY_GUIDANCE[industry].touchpoints.map(x=><span key={x}>{x}</span>)}</div></div>
            <div className="bramer-guide-columns">
              <div><h3>17개 기본 구성 · 6개 분류</h3><div className="bramer-guide-items">{recommended.map(item=><div key={item.id}><div><strong>{names[item.id]}</strong><small>{INDUSTRY_RATIONALE[industry].components[item.id] ?? item.description}</small></div><span>기본</span></div>)}</div><p className="bramer-guide-footnote">기본 항목 17개는 모든 업종에서 동일하게 생성됩니다. 실제 규격과 정보는 검토 후 사용하세요.</p></div>
              <div><div className="bramer-guide-doc-head"><h3>준비할 자료</h3><span>{documents[industry].filter(item=>checked[item]).length}/{documents[industry].length}</span></div>
                <input className="bramer-guide-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="자료 검색" aria-label="준비할 자료 검색"/>
                <div className="bramer-guide-checklist">{selectedDocs.map(item=><label key={item}><input type="checkbox" checked={Boolean(checked[item])} onChange={e=>setChecked(p=>({...p,[item]:e.target.checked}))}/><span><strong>{item}</strong><small>{INDUSTRY_RATIONALE[industry].files[item]}</small></span></label>)}</div>
                <p className="bramer-guide-footnote">로고 SVG와 텍스트·연락처 정보로 제작합니다. 사진·모션·별도 패키지 원본은 요구하지 않습니다.</p>
              </div>
            </div>
            <div className="bramer-guide-bottom"><button className="bramer-dash-primary" type="button" onClick={()=>onCreate(industry)}>이 업종으로 만들기</button></div>
          </section>
        </>}
      </main>
    </div>
  </div>;
}
