import { useEffect, useMemo, useState, type FormEvent } from 'react';
import BramerLogo from './components/BramerLogo';
import { firebaseProjectId, type BetaTester, type UsageEvent } from './firebaseAdmin';

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
    setTesters([]);setEvents([]);setError('');
    setSection('overview');setSearch('');setOccupation('all');
  }
  const available = unlocked;
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
  const validData=false; // Firestore records are never exposed by a browser-only PIN.
  const statusMessage=unlocked?'화면 미리보기':'비밀번호 입력';
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
            
          </div>
        </div>
        {menuOpen?<nav className="bramer-admin-mobile-menu" aria-label="모바일 관리자 메뉴">
          {(['overview','testers','events'] as AdminSection[]).map(value=><button key={value} type="button"
            onClick={()=>selectSection(value)}>{sectionNames[value]}</button>)}</nav>:null}

        <section className="bramer-admin-setup-banner">
          <div><small>FIREBASE DATA ACCESS</small><h2>관리자 화면 미리보기</h2>
            <p>비밀번호로 화면을 열었습니다. 현재는 실제 등록자·이용 기록이 표시되지 않습니다.</p>
            <p>Firestore 개인정보를 조회하려면 별도의 Firebase 관리자 인증 또는 서버 기반 권한 확인이 필요합니다.</p></div>
          <span>조회 연결 전</span>
        </section>
        {error?<div className="bramer-admin-error" role="alert">{error}</div>:null}
        <div className="bramer-admin-preview-data">
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
          <span>Firebase {firebaseProjectId} · 기록 조회 미연결</span>
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
