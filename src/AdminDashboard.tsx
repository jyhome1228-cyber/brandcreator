import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import BramerLogo from './components/BramerLogo';
import { firebaseProjectId, signInAdmin, loadAdminData, type AdminSession, type BetaTester, type UsageEvent } from './firebaseAdmin';
import { fetchDailyVisits, latestDays, checkVisitConnectivity, lastVisitRecordStatus, type DailyVisits } from './visitorStats';

type AdminSection = 'overview' | 'visitors' | 'testers' | 'events';
type Props = { onHome: () => void };
const sectionNames: Record<AdminSection,string> = {
  overview:'대시보드', visitors:'방문 기록', testers:'베타테스터', events:'이용 기록',
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
  const csv='\uFEFF'+rows.map(row=>row.map(cell=>{
    const value=String(cell??'');
    const safe=/^\s*[=+\-@]|^[\t\r\n]/.test(value)?"'"+value:value;
    return '"'+safe.replace(/"/g,'""')+'"';
  }).join(',')).join('\r\n');
  const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=href;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function shortDate(value:Date) {return `${value.getMonth()+1}/${value.getDate()}`;}

export default function AdminDashboard({onHome}:Props) {
  const [unlocked,setUnlocked]=useState(() => {
    try { return sessionStorage.getItem('bramer-admin-preview-v1') === 'yes'; }
    catch { return false; }
  });
  const [password,setPassword]=useState('');
  const [loading] = useState(false);
  const [error,setError]=useState('');
  const [testers,setTesters]=useState<BetaTester[]>([]);
  const [events,setEvents]=useState<UsageEvent[]>([]);
  const [section,setSection]=useState<AdminSection>('overview');
  const [search,setSearch]=useState('');
  const [occupation,setOccupation]=useState('all');
  const [menuOpen,setMenuOpen]=useState(false);
  const [adminSession,setAdminSession]=useState<AdminSession|null>(null);
  const [adminEmail,setAdminEmail]=useState('');
  const [adminPassword,setAdminPassword]=useState('');
  const [adminPending,setAdminPending]=useState(false);
  const [adminError,setAdminError]=useState('');
  const [privateLoading,setPrivateLoading]=useState(false);
  const privateRevision=useRef(0);
  const sessionRef=useRef<AdminSession|null>(null);
  function disconnectAdmin(){
    ++privateRevision.current;
    sessionRef.current=null;
    setAdminSession(null);setTesters([]);setEvents([]);setPrivateLoading(false);setAdminError('');
  }
  async function loadPrivateData(current:AdminSession){
    const revision=++privateRevision.current;
    setPrivateLoading(true);
    try {
      const records=await loadAdminData(current);
      if(revision!==privateRevision.current || sessionRef.current!==current)return;
      setTesters(records.testers);
      setEvents(records.events);
      setAdminError('');
    }catch(e){
      if(revision!==privateRevision.current || sessionRef.current!==current)return;
      const message=e instanceof Error?e.message:'Firebase 관리자 데이터를 읽지 못했습니다.';
      setTesters([]);setEvents([]);
      if(/만료|권한이 거부/.test(message))disconnectAdmin();
      setAdminError(message);
    }finally{if(revision===privateRevision.current)setPrivateLoading(false);}
  }
  async function adminLogin(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(adminPending)return;
    setAdminPending(true);setAdminError('');
    try{
      const current=await signInAdmin(adminEmail.trim(),adminPassword);
      sessionRef.current=current;
      setAdminSession(current);
      setAdminPassword('');
      await loadPrivateData(current);
    }catch(e){
      setAdminError(e instanceof Error?e.message:'관리자 인증에 실패했습니다.');
    }finally{setAdminPending(false);}
  }
  const [visits,setVisits]=useState<DailyVisits[]>([]);
  const [visitLoading,setVisitLoading]=useState(false);
  const [visitReady,setVisitReady]=useState(false);
  const [visitError,setVisitError]=useState('');
  const [diagnostic,setDiagnostic]=useState('');
  const [diagnosing,setDiagnosing]=useState(false);
  const [lastVisit,setLastVisit]=useState(lastVisitRecordStatus);

  const diagnose=async()=>{
    setDiagnosing(true);
    setLastVisit(lastVisitRecordStatus());
    try{
      const result=await checkVisitConnectivity();
      setDiagnostic(`인증: ${result.auth==='ok'?'정상':'오류'} · 조회: ${result.read==='ok'?'정상':result.read==='error'?'오류':'미확인'} — ${result.message}`);
    }finally{setDiagnosing(false);}
  };
  const refreshVisits=async()=>{
    setVisitLoading(true);setVisitError('');
    try {
      const daily=await fetchDailyVisits();
      setVisits(daily);setVisitReady(true);
    }catch(e){
      setVisitError(e instanceof Error?e.message:'방문 통계를 불러오지 못했습니다.');
      setVisitReady(false);
    }finally {setVisitLoading(false);}
  };
  useEffect(()=>{if(unlocked)void refreshVisits();},[unlocked]);

  useEffect(()=>{document.title='BRAMER ADMIN | 베타 운영 관리';return()=>{document.title='BRAMER | 로고만 있다면, 가이드라인이 뚝딱!';};},[]);
  function unlock(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // This is deliberately a UI-preview PIN, not an authentication mechanism.
    // Firestore data stays inaccessible without Firebase admin authentication.
    if(password !== '1228') {setError('비밀번호를 확인해 주세요.');return;}
    try {sessionStorage.setItem('bramer-admin-preview-v1','yes');} catch { /* optional */ }
    setUnlocked(true);setPassword('');setError('');
  }
  function logout() {
    try {sessionStorage.removeItem('bramer-admin-preview-v1');} catch { /* optional */ }
    setUnlocked(false);setPassword('');
    disconnectAdmin();setAdminEmail('');setAdminPassword('');
    setTesters([]);setEvents([]);setVisits([]);setVisitReady(false);setVisitError('');setError('');
    setSection('overview');setSearch('');setOccupation('all');
  }
  const available = visitReady;
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
  const validData=Boolean(adminSession) && !privateLoading; // Firebase authorization, not the preview PIN.
  const visitorTotal=visits.reduce((total,row)=>total+row.visits,0);
  const todayRecord=visits.find(row=>row.day===latestDays(1)[0]);
  const sevenKeys=new Set(latestDays(7));
  const sevenDayTotal=visits.reduce((total,row)=>total+(sevenKeys.has(row.day)?row.visits:0),0);
  const chartDays=latestDays(7).map(day=>({
    label:day.slice(5).replace('-','/'),
    count:visits.find(row=>row.day===day)?.visits||0,
  }));
  const chartMax=Math.max(1,...chartDays.map(row=>row.count));
  const orderedVisits=[...visits].sort((a,b)=>b.day.localeCompare(a.day));
  const statusMessage=unlocked?(visitReady?'방문 통계 연결':'방문 통계 설정 확인'):'비밀번호 입력';
  const exportVisits=()=>downloadCsv([
    ['날짜','방문 횟수','해당 날짜 첫 방문 브라우저'],
    ...orderedVisits.map(row=>[row.day,String(row.visits),String(row.unique)]),
  ],'bramer-daily-visits.csv');
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

  if (!unlocked) return <div className="bramer-admin bramer-admin-pin-screen">
    <header className="bramer-admin-header">
      <button type="button" className="bramer-admin-logo" onClick={onHome} aria-label="BRAMER 홈페이지"><BramerLogo light/></button>
      <span className="bramer-admin-header-name">ADMIN</span>
      <div className="bramer-admin-header-actions"><button type="button" onClick={onHome}>홈페이지</button></div>
    </header>
    <main className="bramer-admin-pin-main">
      <div className="bramer-admin-pin-card">
        <span>BRAMER ADMIN</span><h1>관리자 화면</h1>
        <p>비밀번호를 입력하면 관리자 대시보드 화면을 확인할 수 있습니다.</p>
        <form onSubmit={unlock}>
          <label htmlFor="bramer-admin-pin">비밀번호</label>
          <input id="bramer-admin-pin" type="password" inputMode="numeric" autoComplete="off"
            maxLength={12} value={password} onChange={event=>setPassword(event.target.value)}
            placeholder="비밀번호 입력" required autoFocus/>
          {error?<p role="alert" className="bramer-admin-pin-error">{error}</p>:null}
          <button type="submit">확인</button>
        </form>
        <small>현재 4자리 코드는 화면 확인용입니다. 실제 이용자 데이터는 Firebase 관리자 인증이 필요합니다.</small>
      </div>
    </main>
  </div>;
  return <div className="bramer-admin">
    <header className="bramer-admin-header">
      <button type="button" className="bramer-admin-logo" onClick={onHome} aria-label="BRAMER 홈페이지"><BramerLogo light/></button>
      <span className="bramer-admin-header-name">ADMIN</span>
      <div className="bramer-admin-header-actions">
        <span className={'bramer-admin-connection '+(available?'connected':'')}>{statusMessage}</span>
        {unlocked?<button type="button" onClick={logout}>잠금</button>:null}
        <button type="button" className="bramer-admin-home" onClick={onHome}>홈페이지</button>
      </div>
    </header>
    <div className="bramer-admin-layout">
      <aside className="bramer-admin-sidebar">
        <div className="bramer-admin-side-label">BRAMER WORKSPACE</div>
        <strong>운영 관리</strong>
        <nav aria-label="관리자 메뉴">
          {(['overview','visitors','testers','events'] as AdminSection[]).map(value=><button key={value}
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
              section==='visitors'?'날짜별 방문 횟수와 누적 집계를 확인합니다.':section==='testers'?'등록한 사용자 정보와 활동 현황을 확인합니다.':'가이드라인 제작과 이용 기록을 살펴봅니다.'}</span>
          </div>
          <div className="bramer-admin-title-actions">
            <button type="button" className="bramer-admin-mobile-nav" aria-expanded={menuOpen}
              onClick={()=>setMenuOpen(open=>!open)}>메뉴</button>
            <button type="button" onClick={()=>{void refreshVisits();if(sessionRef.current)void loadPrivateData(sessionRef.current);}} disabled={visitLoading||privateLoading}>
              {visitLoading||privateLoading?'조회 중':'새로고침'}
            </button>
          </div>
        </div>
        {menuOpen?<nav className="bramer-admin-mobile-menu" aria-label="모바일 관리자 메뉴">
          {(['overview','visitors','testers','events'] as AdminSection[]).map(value=><button key={value} type="button"
            onClick={()=>selectSection(value)}>{sectionNames[value]}</button>)}</nav>:null}

        <section className="bramer-admin-setup-banner">
          <div><small>BRAMER VISITOR ANALYTICS</small>
            <h2>{visitReady?'방문 기록 집계 중':'Firebase 방문 기록 설정 필요'}</h2>
            <p>{visitReady?'방문자 통계가 Firestore에 날짜별로 기록됩니다. 집계를 활성화한 시점부터의 방문만 표시합니다.':
              'Firebase 익명 로그인을 활성화하고 Firestore 방문 기록 규칙을 게시하면 실측 방문 횟수를 기록할 수 있습니다.'}</p>
            <p>개인정보가 없는 일별 집계이며, 베타테스터 연락처 등은 별도의 관리자 인증 없이는 조회되지 않습니다.</p>
            {visitError?<p className="bramer-admin-visit-error" role="alert">{visitError}</p>:null}
            <div className="bramer-admin-diagnostic">
              <button type="button" onClick={()=>void diagnose()} disabled={diagnosing}>
                {diagnosing?'연동 확인 중':'Firebase 연결 진단'}
              </button>
              {diagnostic?<p role="status">{diagnostic}</p>:null}
              {lastVisit?<p className={lastVisit.ok?'bramer-admin-visit-ok':'bramer-admin-visit-error'}>
                최근 홈페이지 기록 ({lastVisit.day}): {lastVisit.detail}
              </p>:<p>이 브라우저의 방문 기록 시도가 아직 없습니다. 홈페이지를 방문한 뒤 다시 진단해 주세요.</p>}
            </div>
          </div><span>{visitLoading?'조회 중':visitReady?'집계 연결':'설정 확인'}</span>
        </section>
        {error?<div className="bramer-admin-error" role="alert">{error}</div>:null}
        {!adminSession?
          <section className="bramer-admin-signin bramer-admin-private-login">
            <div className="bramer-admin-signin-top">
              <small>FIREBASE AUTHENTICATION</small><h2>등록자 정보 보호</h2>
              <p>등록자 정보는 Firebase 관리자에게만 표시됩니다. Authentication의 이메일/비밀번호 로그인 활성화, 관리자 계정 생성, Firestore admins/{'{UID}'} 문서의 active=true 설정이 필요합니다.</p>
            </div>
            <form onSubmit={event=>void adminLogin(event)}>
              <label><span>관리자 이메일</span><input type="email" autoComplete="username" required
                value={adminEmail} onChange={event=>setAdminEmail(event.target.value)} placeholder="이메일"/></label>
              <label><span>비밀번호</span><input type="password" autoComplete="current-password" required
                value={adminPassword} onChange={event=>setAdminPassword(event.target.value)} placeholder="비밀번호"/></label>
              <button type="submit" disabled={adminPending}>{adminPending?'인증 중':'등록자 조회 인증'}</button>
            </form>
            {adminError?<p role="alert" className="bramer-admin-error">{adminError}</p>:null}
          </section>:null}
        {adminSession?<div className="bramer-admin-verified"><span>Firebase 관리자 인증됨</span>
          <button type="button" onClick={disconnectAdmin}>관리자 연결 해제</button>
          <button type="button" onClick={()=>void loadPrivateData(adminSession)} disabled={privateLoading}>{privateLoading?'조회 중':'데이터 새로고침'}</button>
        </div>:null}
        <div className="bramer-admin-preview-data">
          {section==='overview'?<>
            <div className="bramer-admin-metrics">
              {[{label:'누적 방문',value:visitorTotal,caption:'집계 시작 이후 전체 방문',ready:visitReady},
                {label:'오늘 방문',value:todayRecord?.visits||0,caption:'오늘 발생한 방문',ready:visitReady},
                {label:'최근 7일 방문',value:sevenDayTotal,caption:'최근 일주일 방문 합계',ready:visitReady},
                {label:'오늘 방문 브라우저',value:todayRecord?.unique||0,caption:'오늘 첫 방문한 브라우저',ready:visitReady}].map(item=>
                  <article key={item.label}><span>{item.label}</span><strong>{item.ready?item.value.toLocaleString('ko-KR'):'—'}</strong><small>{item.caption}</small></article>)}
            </div>
            <div className="bramer-admin-overview-grid">
              <section className="bramer-admin-panel">
                <div className="bramer-admin-panel-head"><div><h2>이용 추이</h2><p>최근 7일 방문 횟수</p></div><span>7 DAYS</span></div>
                <div className="bramer-admin-chart" role="img" aria-label="최근 7일 이용 이벤트 막대 차트">
                  {chartDays.map(day=><div key={day.label} className="bramer-admin-chart-day">
                    <div className="bramer-admin-chart-track"><div style={{height:visitReady?`${Math.max(day.count/chartMax*100,day.count?3:0)}%`:'0%'}}/></div>
                    <span>{day.label}</span></div>)}
                </div>
                {!visits.length&&<p className="bramer-admin-empty-chart">{visitReady?'집계된 방문 기록이 없습니다.':'방문 기록 연결 후 표시됩니다.'}</p>}
              </section>
              <section className="bramer-admin-panel">
                <div className="bramer-admin-panel-head"><div><h2>최근 활동</h2><p>기록된 주요 이용 이벤트</p></div>
                  <button type="button" onClick={()=>selectSection('events')}>전체 보기</button></div>
                {adminSession&&sortedEvents.length ? <div className="bramer-admin-activity">
                  {sortedEvents.slice(0,5).map(item=><div key={item.id}>
                    <span className="bramer-admin-activity-dot"/><div><strong>{eventNames[item.event]||item.event}</strong>
                    <small>{item.projectName||item.userId||'이용 기록'}</small></div>
                    <time>{readableDate(item.createdAt,true)}</time></div>)}
                </div>:<div className="bramer-admin-empty">{adminSession?'아직 기록된 활동이 없습니다.':'관리자 인증 후 이용 기록을 확인할 수 있습니다.'}</div>}
              </section>
            </div>
            <section className="bramer-admin-panel bramer-admin-recent">
              <div className="bramer-admin-panel-head"><div><h2>최근 등록자</h2><p>베타테스터 등록 현황</p></div>
                <button type="button" onClick={()=>selectSection('testers')}>등록자 관리</button></div>
              {adminSession?<TesterTable testers={testers.slice().sort((a,b)=>b.registeredAt.localeCompare(a.registeredAt)).slice(0,6)}/>:<div className="bramer-admin-empty">Firebase 관리자 인증 후 최근 등록자가 표시됩니다.</div>}
            </section>
          </>:section==='visitors'?<section className="bramer-admin-panel bramer-admin-table-panel">
            <div className="bramer-admin-list-head"><div><h2>날짜별 방문 기록</h2>
              <p>{visitReady?`총 ${orderedVisits.length}일 · 누적 ${visitorTotal.toLocaleString('ko-KR')}회`:'Firebase 방문 기록 연결 필요'}</p></div>
              <button type="button" onClick={exportVisits} disabled={!visitReady}>CSV 내보내기</button>
            </div>
            <div className="bramer-admin-table-scroll"><table>
              <thead><tr><th>날짜</th><th>방문 횟수</th><th>첫 방문 브라우저</th></tr></thead>
              <tbody>{orderedVisits.length?orderedVisits.map(row=><tr key={row.day}>
                <td><strong>{row.day}</strong></td><td>{row.visits.toLocaleString('ko-KR')}</td>
                <td>{row.unique.toLocaleString('ko-KR')}</td>
              </tr>):<tr><td colSpan={3} className="bramer-admin-empty-row">
                {visitReady?'아직 집계된 방문 기록이 없습니다.':'방문 통계 연결이 필요합니다.'}
              </td></tr>}</tbody>
            </table></div>
          </section>:section==='testers'?<>
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
              {adminSession?<TesterTable testers={activeTesters}/>:<div className="bramer-admin-empty">Firebase 관리자 인증 후 베타테스터 정보를 확인할 수 있습니다.</div>}
            </section>
          </>:<section className="bramer-admin-panel bramer-admin-table-panel">
            <div className="bramer-admin-list-head"><div><h2>이용 기록</h2>
              <p>최근 기록부터 표시 · {validData?`총 ${sortedEvents.length}건`:'관리자 인증 필요'}</p></div>
              <button type="button" onClick={exportEvents} disabled={!validData}>CSV 내보내기</button></div>
            <div className="bramer-admin-table-scroll"><table><thead><tr>
              <th>이벤트</th><th>사용자 ID</th><th>프로젝트</th><th>일시</th>
            </tr></thead><tbody>{sortedEvents.length?sortedEvents.map(item=><tr key={item.id}>
              <td><strong>{eventNames[item.event]||item.event}</strong></td><td>{item.userId||'—'}</td>
              <td>{item.projectName||'—'}</td><td>{readableDate(item.createdAt,true)}</td>
            </tr>):<tr><td colSpan={4} className="bramer-admin-empty-row">{adminSession?'기록된 이용 이벤트가 없습니다.':'Firebase 관리자 인증 후 이용 기록이 표시됩니다.'}</td></tr>}</tbody></table></div>
          </section>}
        </div>
        <footer className="bramer-admin-footer">
          <span>© 2026 NINEWORKS · BRAMER ADMIN</span>
          <span>Firebase {firebaseProjectId} · {visitReady?'방문 기록 연결':'방문 기록 미연결'} · {adminSession?'관리자 인증됨':'관리자 미인증'}</span>
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
