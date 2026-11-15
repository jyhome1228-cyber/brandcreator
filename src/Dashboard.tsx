import { useState, type ChangeEvent } from 'react';
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

const documents: Record<IndustryId, string[]> = {
  fintech: ['브랜드 로고 SVG', '브랜드 컬러 정보', '주요 서비스 화면', '앱 아이콘', '고객 안내 문구'],
  commerce: ['브랜드 로고 SVG', '상품 이미지', '온라인 스토어 화면', '홍보 배너', '패키지 이미지'],
  beauty: ['브랜드 로고 SVG', '브랜드 컬러 정보', '제품 이미지 및 패키지 도면', '대표 촬영 이미지', '브랜드 소개 문구'],
  content: ['브랜드 로고 SVG', '대표 콘텐츠 이미지', '콘텐츠 썸네일', '모션 자료', '그래픽 자산'],
  mobility: ['브랜드 로고 SVG', '차량 이미지', '서비스 화면', '안내 사인', '고객 안내 문구'],
  service: ['브랜드 로고 SVG', '웹·앱 화면', '서비스 이미지', '고객 안내 문구', '서비스 아이콘'],
  technology: ['브랜드 로고 SVG', 'UI 화면', '서비스 아이콘', '기술 소개 자료', '제품 이미지'],
  corporate: ['브랜드 로고 SVG', '회사소개서', '명함 및 서식', '사인·간판 이미지', '제품 이미지'],
};

const names: Record<string,string> = {
  overview:'브랜드 소개',logo:'로고 사용 규칙',color:'컬러 규칙',typography:'서체와 텍스트',
  graphic:'그래픽·모션',photography:'사진 스타일',verbal:'브랜드 언어',application:'응용 디자인',
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
      <button className="bramer-dash-logo" onClick={onHome} type="button" aria-label="Bramer 랜딩페이지로 이동">Bramer.</button>
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
            <p>업종에 따라 추천되는 구성요소와 준비할 자료를 확인해보세요. 원하는 항목은 제작 과정에서 직접 조정할 수 있습니다.</p>
          </div>
          <section className="bramer-dash-section bramer-guide-content">
            <label className="bramer-guide-select">브랜드 업종
              <select value={industry} onChange={e=>{setIndustry(e.target.value as IndustryId);setChecked({});setSearch('');}}>
                {INDUSTRIES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <div className="bramer-guide-overview"><h2>{industryLabel}</h2><p>{INDUSTRY_GUIDANCE[industry].focus}</p><div>{INDUSTRY_GUIDANCE[industry].touchpoints.map(x=><span key={x}>{x}</span>)}</div></div>
            <div className="bramer-guide-columns">
              <div><h3>권장 가이드라인 구성</h3><div className="bramer-guide-items">{recommended.map(item=><div key={item.id}><div><strong>{names[item.id]}</strong><small>{item.description}</small></div><span>{recommendation[item.id]==='Core'?'기본':'추천'}</span></div>)}</div><p className="bramer-guide-footnote">추천 항목은 초기 실무 가이드이며, 브랜드 환경에 따라 조정할 수 있습니다.</p></div>
              <div><div className="bramer-guide-doc-head"><h3>준비할 자료</h3><span>{documents[industry].filter(item=>checked[item]).length}/{documents[industry].length}</span></div>
                <input className="bramer-guide-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="자료 검색" aria-label="준비할 자료 검색"/>
                <div className="bramer-guide-checklist">{selectedDocs.map(item=><label key={item}><input type="checkbox" checked={Boolean(checked[item])} onChange={e=>setChecked(p=>({...p,[item]:e.target.checked}))}/>{item}</label>)}</div>
                <p className="bramer-guide-footnote">로고 SVG 외의 자료는 선택한 항목에 따라 준비하면 돼요.</p>
              </div>
            </div>
            <div className="bramer-guide-bottom"><button className="bramer-dash-primary" type="button" onClick={()=>onCreate(industry)}>이 업종으로 만들기</button></div>
          </section>
        </>}
      </main>
    </div>
  </div>;
}
