import { useEffect, useMemo, useState, type FormEvent } from 'react';
import BramerLogo from './components/BramerLogo';
import {
  firebaseReady, firebaseProjectId, signInAdmin, loadAdminData,
  type AdminSession, type BetaTester, type UsageEvent,
} from './firebaseAdmin';

type AdminSection = 'overview' | 'testers' | 'events';
type Props = { onHome: () => void };
const sectionNames: Record<AdminSection,string> = {
  overview:'대시보드', testers:'베타테스터', events:'이용 기록',
};
const eventNames: Record<string,string> = {
  registration:'베타 등록',
  login:'로그인',
  project_created:'프로젝트 생성',
  guideline_generated:'가이드라인 제작',
  guideline_exported:'파일 내보내기',
  export_pdf:'PDF 내보내기',
  export_svg:'SVG 내보내기',
};
function readableDate(value:string, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR',withTime?
    {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}:
    {year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function downloadCsv(rows:string[][], filename:string) {
  const csv='\uFEFF'+rows.map(row=>row.map(cell=>'"'+String(cell??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=href;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function shortDate(value:Date) {return `${value.getMonth()+1}/${value.getDate()}`;}

export default function AdminDashboard({onHome}:Props) {
  const [session,setSession]=useState<AdminSession|null>(null);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loggingIn,setLoggingIn]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [testers,setTesters]=useState<BetaTester[]>([]);
  const [events,setEvents]=useState<UsageEvent[]>([]);
  const [section,setSection]=useState<AdminSection>('overview');
  const [search,setSearch]=useState('');
  const [occupation,setOccupation]=useState('all');
  const [menuOpen,setMenuOpen]=useState(false);

  const refresh = async (current:AdminSession) => {
    setLoading(true);setError('');
    try {
      const data=await loadAdminData(current);
      setTesters(data.testers);
      setEvents(data.events);
    } catch (e) {
      const message=e instanceof Error?e.message:'관리자 데이터를 불러올 수 없습니다.';
      setError(message);
      if (/권한|승인|로그인|인증/.test(message)) {
        setSession(null);setTesters([]);setEvents([]);
      }
    } finally {setLoading(false);}
  };
  useEffect(()=>{document.title='BRAMER ADMIN | 베타 운영 관리';return()=>{document.title='BRAMER | 로고만 있다면, 가이드라인이 뚝딱!';};},[]);
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()||!password) return;
    setLoggingIn(true);setError('');
    try {
      const current=await signInAdmin(email.trim(),password);
      setSession(current);setPassword('');
      await refresh(current);
    } catch (e) {setError(e instanceof Error?e.message:'관리자 로그인에 실패했습니다.');}
    finally {setLoggingIn(false);}
  }
  function logout() {
    setSession(null);setEmail('');setPassword('');
    setTesters([]);setEvents([]);setError('');
    setSection('overview');setSearch('');setOccupation('all');
  }
  const available = Boolean(session);
  const activeTesters=useMemo(()=>{
    const normalized=search.trim().toLocaleLowerCase('ko-KR');
    return testers.filter(tester=>
      (occupation==='all'||tester.occupation===occupation) &&
      (!normalized||[tester.name,tester.phone,tester.occupation,tester.id].some(value=>value.toLocaleLowerCase('ko-KR').includes(normalized)))
    ).sort((a,b)=>(b.registeredAt||'').localeCompare(a.registeredAt||''));
  },[testers,search,occupation]);
  const occupations=useMemo(()=>Array.from(new Set(testers.map(tester=>tester.occupation).filter(Boolean))).sort(),[testers]);
  const sortedEvents=useMemo(()=>[...events].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[events]);
  const days=useMemo(()=>Array.from({length:7},(_,index)=>{
    const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(6-index));
    const next=new Date(date);next.setDate(date.getDate()+1);
    const count=events.filter(item=>{
      const when=new Date(item.createdAt).getTime();
      return when>=date.getTime()&&when<next.getTime();
    }).length;
    return {label:shortDate(date),count};
  }),[events]);
  const maxDay=Math.max(1,...days.map(day=>day.count));
  const latestWeek=events.filter(item=>new Date(item.createdAt).getTime()>Date.now()-7*86400000).length;
  const produced=events.filter(item=>item.event==='guideline_generated').length;
  const exported=events.filter(item=>item.event==='guideline_exported'||item.event==='export_pdf'||item.event==='export_svg').length;
  const validData=available&&!loading;
  const statusMessage=!firebaseReady?'Firebase 연결 전':!available?'관리자 로그인 필요':loading?'데이터 불러오는 중':'Firestore 연결됨';
  const exportTesters=()=>downloadCsv([
    ['성함','연락처','직업','등록일','최근 이용','프로젝트 수','가이드라인 생성','상태'],
    ...activeTesters.map(item=>[item.name,item.phone,item.occupation,readableDate(item.registeredAt,true),
      readableDate(item.lastActiveAt,true),String(item.projectCount),String(item.guidelineCount),item.status]),
  ],'bramer-beta-testers.csv');
  const exportEvents=()=>downloadCsv([
    ['일시','사용자 ID','이벤트','프로젝트','상세'],
    ...sortedEvents.map(item=>[readableDate(item.createdAt,true),item.userId,eventNames[item.event]||item.event,item.projectName,item.detail]),
  ],'bramer-usage-events.csv');
  const selectSection=(value:AdminSection)=>{setSection(value);setMenuOpen(false);};

  return <div className="bramer-admin">
    <header className="bramer-admin-header">
      <button type="button" className="bramer-admin-logo" onClick={onHome} aria-label="BRAMER 홈페이지"><BramerLogo light/></button>
      <span className="bramer-admin-header-name">ADMIN</span>
      <div className="bramer-admin-header-actions">
        <span className={'bramer-admin-connection '+(available?'connected':'')}>{statusMessage}</span>
        {session?<button type="button" onClick={logout}>로그아웃</button>:null}
        <button type="button" className="bramer-admin-home" onClick={onHome}>홈페이지</button>
      </div>
    </header>
    <div className="bramer-admin-layout">
      <aside className="bramer-admin-sidebar">
        <div className="bramer-admin-side-label">BRAMER WORKSPACE</div>
        <strong>운영 관리</strong>
        <nav aria-label="관리자 메뉴">
          {(['overview','testers','events'] as AdminSection[]).map(value=><button key={value}
            type="button" className={section===value?'active':''}
            aria-current={section===value?'page':undefined} onClick={()=>selectSection(value)}>
            {sectionNames[value]}</button>)}
        </nav>
        <div className="bramer-admin-sidebar-foot">NINEWORKS<br/>BRAMER Beta · 2026</div>
      </aside>
      <main className="bramer-admin-main">
        <div className="bramer-admin-titlebar">
          <div>
            <p>BRAMER ADMINISTRATION</p>
            <h1>{sectionNames[section]}</h1>
            <span>{section==='overview'?'베타 서비스 이용 현황을 한곳에서 확인합니다.':
              section==='testers'?'등록한 사용자 정보와 활동 현황을 확인합니다.':'가이드라인 제작과 이용 기록을 살펴봅니다.'}</span>
          </div>
          <div className="bramer-admin-title-actions">
            <button type="button" className="bramer-admin-mobile-nav" aria-expanded={menuOpen}
              onClick={()=>setMenuOpen(open=>!open)}>메뉴</button>
            {available&&<button type="button" onClick={()=>void refresh(session!)} disabled={loading}>{loading?'불러오는 중':'새로고침'}</button>}
          </div>
        </div>
        {menuOpen?<nav className="bramer-admin-mobile-menu" aria-label="모바일 관리자 메뉴">
          {(['overview','testers','events'] as AdminSection[]).map(value=><button key={value} type="button"
            onClick={()=>selectSection(value)}>{sectionNames[value]}</button>)}</nav>:null}

        {!firebaseReady?<section className="bramer-admin-setup-banner">
          <div><small>FIREBASE SETUP</small><h2>관리자 화면 준비 완료</h2>
            <p>대시보드 레이아웃과 데이터 조회 구조를 만들었습니다. Firebase 프로젝트 ID와 Web API 키를 연결하면 관리자 인증과 Firestore 데이터 조회를 사용할 수 있습니다.</p>
            <p>아직 실제 베타테스터 정보가 수집되거나 연결된 상태는 아닙니다.</p></div>
          <span>연결 대기</span>
        </section>:!available?<section className="bramer-admin-signin">
          <div className="bramer-admin-signin-top"><small>SECURE ACCESS</small><h2>관리자 로그인</h2>
            <p>Firebase Authentication 계정으로 로그인합니다. 관리자 UID가 Firestore에 승인되어 있어야 데이터를 확인할 수 있습니다.</p></div>
          <form onSubmit={event=>void login(event)}>
            <label><span>이메일</span><input type="email" autoComplete="username" placeholder="관리자 이메일"
              value={email} onChange={event=>setEmail(event.target.value)} required /></label>
            <label><span>비밀번호</span><input type="password" autoComplete="current-password"
              placeholder="비밀번호" value={password} onChange={event=>setPassword(event.target.value)} required /></label>
            <button type="submit" disabled={loggingIn}>{loggingIn?'확인 중':'관리자 로그인'}</button>
          </form>
        </section>:null}

        {error?<div className="bramer-admin-error" role="alert">{error}</div>:null}
        <div className={!validData?'bramer-admin-locked':''}>
          {section==='overview'?<>
            <div className="bramer-admin-metrics">
              {[{label:'베타 등록자',value:testers.length,caption:'누적 등록 인원'},
                {label:'최근 7일 활동',value:latestWeek,caption:'기록된 주요 이벤트'},
                {label:'가이드라인 생성',value:produced,caption:'누적 생성 이벤트'},
                {label:'결과물 내보내기',value:exported,caption:'SVG·PDF 출력 이벤트'}].map(item=>
                  <article key={item.label}><span>{item.label}</span><strong>{validData?item.value.toLocaleString('ko-KR'):'—'}</strong><small>{item.caption}</small></article>)}
            </div>
            <div className="bramer-admin-overview-grid">
              <section className="bramer-admin-panel">
                <div className="bramer-admin-panel-head"><div><h2>이용 추이</h2><p>최근 7일 주요 이용 이벤트</p></div><span>7 DAYS</span></div>
                <div className="bramer-admin-chart" role="img" aria-label="최근 7일 이용 이벤트 막대 차트">
                  {days.map(day=><div key={day.label} className="bramer-admin-chart-day">
                    <div className="bramer-admin-chart-track"><div style={{height:validData?`${Math.max(day.count/maxDay*100,day.count?3:0)}%`:'0%'}}/></div>
                    <span>{day.label}</span></div>)}
                </div>
                {!events.length&&<p className="bramer-admin-empty-chart">집계된 이용 기록이 없습니다.</p>}
              </section>
              <section className="bramer-admin-panel">
                <div className="bramer-admin-panel-head"><div><h2>최근 활동</h2><p>기록된 주요 이용 이벤트</p></div>
                  <button type="button" onClick={()=>selectSection('events')}>전체 보기</button></div>
                {sortedEvents.length ? <div className="bramer-admin-activity">
                  {sortedEvents.slice(0,5).map(item=><div key={item.id}>
                    <span className="bramer-admin-activity-dot"/><div><strong>{eventNames[item.event]||item.event}</strong>
                    <small>{item.projectName||item.userId||'이용 기록'}</small></div>
                    <time>{readableDate(item.createdAt,true)}</time></div>)}
                </div>:<div className="bramer-admin-empty">아직 기록된 활동이 없습니다.</div>}
              </section>
            </div>
            <section className="bramer-admin-panel bramer-admin-recent">
              <div className="bramer-admin-panel-head"><div><h2>최근 등록자</h2><p>베타테스터 등록 현황</p></div>
                <button type="button" onClick={()=>selectSection('testers')}>등록자 관리</button></div>
              <TesterTable testers={testers.slice().sort((a,b)=>b.registeredAt.localeCompare(a.registeredAt)).slice(0,6)}/>
            </section>
          </>:section==='testers'?<>
            <section className="bramer-admin-panel bramer-admin-table-panel">
              <div className="bramer-admin-list-head"><div><h2>베타테스터 목록</h2>
                <p>검색 결과 {validData?activeTesters.length:0}명</p></div>
                <button type="button" onClick={exportTesters} disabled={!validData}>CSV 내보내기</button>
              </div>
              <div className="bramer-admin-filters">
                <input value={search} onChange={event=>setSearch(event.target.value)}
                  placeholder="성함·연락처 검색" aria-label="베타테스터 검색" disabled={!validData}/>
                <select aria-label="직업 필터" value={occupation}
                  onChange={event=>setOccupation(event.target.value)} disabled={!validData}>
                  <option value="all">전체 직업</option>
                  {occupations.map(value=><option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <TesterTable testers={activeTesters}/>
            </section>
          </>:<section className="bramer-admin-panel bramer-admin-table-panel">
            <div className="bramer-admin-list-head"><div><h2>이용 기록</h2>
              <p>최근 기록부터 표시 · 총 {validData?sortedEvents.length:0}건</p></div>
              <button type="button" onClick={exportEvents} disabled={!validData}>CSV 내보내기</button></div>
            <div className="bramer-admin-table-scroll"><table><thead><tr>
              <th>이벤트</th><th>사용자 ID</th><th>프로젝트</th><th>일시</th>
            </tr></thead><tbody>{sortedEvents.length?sortedEvents.map(item=><tr key={item.id}>
              <td><strong>{eventNames[item.event]||item.event}</strong></td><td>{item.userId||'—'}</td>
              <td>{item.projectName||'—'}</td><td>{readableDate(item.createdAt,true)}</td>
            </tr>):<tr><td colSpan={4} className="bramer-admin-empty-row">기록된 이용 이벤트가 없습니다.</td></tr>}</tbody></table></div>
          </section>}
        </div>
        <footer className="bramer-admin-footer">
          <span>© 2026 NINEWORKS · BRAMER ADMIN</span>
          <span>{firebaseProjectId ? 'Firebase '+firebaseProjectId : 'Firebase 연결 전 · 실제 데이터 미수집'}</span>
        </footer>
      </main>
    </div>
  </div>;
}
function TesterTable({testers}:{testers:BetaTester[]}) {
  return <div className="bramer-admin-table-scroll"><table><thead><tr>
    <th>성함</th><th>연락처</th><th>직업</th><th>등록일</th><th>최근 이용</th><th>제작</th><th>상태</th>
  </tr></thead><tbody>{testers.length?testers.map(tester=><tr key={tester.id}>
    <td><strong>{tester.name||'—'}</strong></td><td>{tester.phone||'—'}</td><td>{tester.occupation||'—'}</td>
    <td>{readableDate(tester.registeredAt)}</td><td>{readableDate(tester.lastActiveAt)}</td>
    <td>{tester.guidelineCount}</td><td><span className="bramer-admin-status">{tester.status==='active'?'이용 중':tester.status}</span></td>
  </tr>):<tr><td colSpan={7} className="bramer-admin-empty-row">등록된 베타테스터 데이터가 없습니다.</td></tr>}</tbody></table></div>;
}
