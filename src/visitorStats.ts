/**
 * Privacy-minimal BRAMER visit counter.
 * Only daily aggregate counters are sent to Firestore: no IP, URL, phone or name.
 * Counters are approximate and can be manipulated by automated traffic.
 * Requires Firebase Anonymous Authentication and deployed visitDaily rules.
 */
import { firebaseWebConfig } from './firebaseWebConfig';

export type DailyVisits = { day: string; visits: number; unique: number };
const root=`https://firestore.googleapis.com/v1/projects/${firebaseWebConfig.projectId}/databases/(default)/documents`;
const apiKey=firebaseWebConfig.apiKey;
const tokenStorage='bramer-visitor-auth-v1';
const attemptPrefix='bramer-visit-attempt-';
type CachedAuth={refreshToken:string;idToken:string;expiresAt:number};
let pendingAuth:Promise<string>|null=null;
let pendingTrack:Promise<void>|null=null;
let memoryAuth:CachedAuth|null=null;
const recordedDays=new Set<string>();
function dayId(date=new Date()):string{
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(date);
  const pick=(type:string)=>parts.find(part=>part.type===type)?.value||'';
  return pick('year')+'-'+pick('month')+'-'+pick('day');
}
export function latestDays(count=7):string[]{
  const now=new Date();
  return Array.from({length:count},(_,i)=>dayId(new Date(now.getTime()-(count-1-i)*86400000)));
}
function readAuth():CachedAuth|null{
  try{const raw=localStorage.getItem(tokenStorage);return raw?JSON.parse(raw) as CachedAuth:memoryAuth;}
  catch{return memoryAuth;}
}
export async function visitorToken():Promise<string>{
  if(pendingAuth)return pendingAuth;
  pendingAuth=(async()=>{
    const cached=readAuth();
    if(cached?.idToken&&cached.expiresAt>Date.now()+60000)return cached.idToken;
    let payload:Record<string,unknown>;
    if(cached?.refreshToken){
      const response=await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`,{
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({grant_type:'refresh_token',refresh_token:cached.refreshToken}),
      });
      if(response.ok){
        const refreshed=await response.json() as {id_token:string;refresh_token:string;expires_in:string};
        payload={idToken:refreshed.id_token,refreshToken:refreshed.refresh_token,expiresIn:refreshed.expires_in};
      }else{
        const failure=await response.json().catch(()=>({})) as {error?:{message?:string}};
        const reason=(failure.error?.message||'').toUpperCase();
        if(!/^(TOKEN_EXPIRED|INVALID_REFRESH_TOKEN|USER_NOT_FOUND)$/.test(reason))
          throw new Error('Firebase 인증을 갱신하지 못했습니다. 기존 계정을 유지한 채 다시 시도해 주세요.');
        memoryAuth=null;
        try{localStorage.removeItem(tokenStorage);}catch{}
        payload={};
      }
    }else payload={};
    if(!payload.idToken){
      const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({returnSecureToken:true}),
      });
      if(!response.ok)throw new Error('익명 Firebase 인증을 활성화해야 방문 통계를 기록할 수 있습니다.');
      payload=await response.json() as Record<string,unknown>;
    }
    const token=String(payload.idToken||'');
    if(!token)throw new Error('익명 Firebase 인증 결과가 없습니다.');
    memoryAuth={
      idToken:token,refreshToken:String(payload.refreshToken||''),expiresAt:Date.now()+Math.max(60,Number(payload.expiresIn)||3600)*1000,
    };
    try{localStorage.setItem(tokenStorage,JSON.stringify(memoryAuth));}catch{}
    return token;
  })();
  try{return await pendingAuth;}finally{pendingAuth=null;}
}
export async function getAnonymousFirebaseIdentity():Promise<{uid:string;token:string}>{
  const token=await visitorToken();
  try {
    const payload=token.split('.')[1];
    const decoded=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))) as {sub?:string;user_id?:string};
    const uid=decoded.sub||decoded.user_id;
    if (!uid || !/^[a-zA-Z0-9_-]{6,128}$/.test(uid))throw new Error('Invalid UID');
    return {uid,token};
  } catch {
    throw new Error('Firebase 익명 계정 정보를 확인하지 못했습니다.');
  }
}
type FirestoreDoc={name?:string;updateTime?:string;fields?:Record<string,{integerValue?:string;stringValue?:string}>};
function numberOf(doc:FirestoreDoc,key:string):number{return Number(doc.fields?.[key]?.integerValue||0);}
function firestoreDay(doc:FirestoreDoc):DailyVisits{
  return{day:String(doc.fields?.day?.stringValue||doc.name?.split('/').pop()||''),
    visits:numberOf(doc,'visits'),unique:numberOf(doc,'unique')};
}
type VisitConnectionState = {
  auth: 'ok' | 'error';
  read: 'ok' | 'error' | 'not_checked';
  message: string;
  statusCode?: number;
};
function firestoreResponseError(status:number, operation:'read'|'write', detail:string):Error {
  const summary=detail.toUpperCase();
  if(status===401)return new Error('Firebase 인증 토큰을 확인할 수 없습니다. Authentication의 익명 로그인 설정을 확인해 주세요. (401)');
  if(status===403)return new Error(
    operation==='read'
      ? 'Firestore visitDaily 읽기 권한이 거부됐습니다. Firebase Console에 최신 규칙을 게시했는지 확인해 주세요. (403)'
      : 'Firestore visitDaily 쓰기 권한이 거부됐습니다. 익명 인증과 create/update 규칙을 확인해 주세요. (403)'
  );
  if(status===404&&operation==='read')return new Error('Firestore 데이터베이스 또는 visitDaily 컬렉션이 아직 준비되지 않았습니다. (404)');
  if(summary.includes('QUOTA_EXCEEDED')||status===429)return new Error('Firestore 사용량 제한에 도달했습니다. (429)');
  return new Error('Firestore '+(operation==='read'?'조회':'기록')+' 오류 (HTTP '+status+').');
}
export async function checkVisitConnectivity():Promise<VisitConnectionState> {
  let token:string;
  try { token=await visitorToken(); }
  catch(e) {
    return {auth:'error',read:'not_checked',message:e instanceof Error?e.message:'익명 인증에 실패했습니다.'};
  }
  try {
    const response=await fetch(`${root}/visitDaily/${dayId()}`,{
      cache:'no-store',headers:{Authorization:`Bearer ${token}`},
    });
    if(response.ok||response.status===404) {
      return {auth:'ok',read:'ok',statusCode:response.status,
        message:response.status===404
          ? '익명 로그인과 Firestore 조회는 정상입니다. 오늘 방문 기록이 아직 생성되지 않았습니다.'
          : '익명 로그인과 Firestore 방문 기록 조회가 정상입니다.'};
    }
    return {auth:'ok',read:'error',statusCode:response.status,
      message:firestoreResponseError(response.status,'read','').message};
  }catch{
    return {auth:'ok',read:'error',message:'Firestore 네트워크 요청에 실패했습니다. 브라우저 네트워크 차단 또는 연결 상태를 확인해 주세요.'};
  }
}
export async function fetchDailyVisits():Promise<DailyVisits[]>{
  const rows:DailyVisits[]=[];
  const auth=await visitorToken();
  let token='';
  for(let page=0;page<15;page++){
    const qs=new URLSearchParams({pageSize:'100'});
    if(token)qs.set('pageToken',token);
    const response=await fetch(`${root}/visitDaily?${qs.toString()}`,{cache:'no-store',headers:{Authorization:`Bearer ${auth}`}});
    if(!response.ok){
      throw firestoreResponseError(response.status,'read',await response.text().catch(()=>''));
    }
    const payload=await response.json() as {documents?:FirestoreDoc[];nextPageToken?:string};
    rows.push(...(payload.documents||[]).map(firestoreDay).filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.day)));
    token=payload.nextPageToken||'';
    if(!token)break;
  }
  return rows.sort((a,b)=>a.day.localeCompare(b.day));
}
async function increaseDay(day:string, isUnique:boolean):Promise<void>{
  const auth=await visitorToken();
  const url=`${root}/visitDaily/${day}`;
  for(let attempt=0;attempt<5;attempt++){
    const currentResponse=await fetch(url,{cache:'no-store',headers:{Authorization:`Bearer ${auth}`}});
    if(!currentResponse.ok&&currentResponse.status!==404)throw firestoreResponseError(currentResponse.status,'read','');
    const current:FirestoreDoc=currentResponse.ok?await currentResponse.json() as FirestoreDoc:{};
    const previous=currentResponse.ok?firestoreDay(current):{visits:0,unique:0};
    const query=new URLSearchParams();
    if(currentResponse.ok&&current.updateTime)query.set('currentDocument.updateTime',current.updateTime);
    else query.set('currentDocument.exists','false');
    const body:FirestoreDoc={fields:{
      day:{stringValue:day},visits:{integerValue:String(previous.visits+1)},
      unique:{integerValue:String(previous.unique+(isUnique?1:0))},
    }};
    const response=await fetch(`${url}?${query.toString()}`,{
      method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${auth}`},
      body:JSON.stringify(body),
    });
    if(response.ok)return;
    if(response.status===409||response.status===412){await new Promise<void>(resolve=>setTimeout(resolve,80*(attempt+1)));continue;}
    const detail=await response.text().catch(()=>'');
    throw firestoreResponseError(response.status,'write',detail);
  }
  throw new Error('동시 방문 집계 충돌로 기록하지 못했습니다.');
}
const visitHealthKey='bramer-visitor-record-health-v1';
export function lastVisitRecordStatus():{day:string;ok:boolean;detail:string}|null{
  try{
    const raw=localStorage.getItem(visitHealthKey);
    if(!raw)return null;
    const obj=JSON.parse(raw) as {day:string;ok:boolean;detail:string};
    if(typeof obj.day!=='string'||typeof obj.ok!=='boolean'||typeof obj.detail!=='string')return null;
    return obj;
  }catch{return null;}
}
function reportVisitHealth(day:string,ok:boolean,detail:string){
  try{
    localStorage.setItem(visitHealthKey,JSON.stringify({day,ok,detail:detail.slice(0,180)}));
  }catch{}
}
export async function recordVisit():Promise<void>{
  if(typeof window==='undefined'||location.hash.startsWith('#/admin')||location.pathname.startsWith('/admin'))return;
  const day=dayId();
  const sessionKey=attemptPrefix+'session-'+day;
  const uniqueKey=attemptPrefix+'unique-'+day;
  if(recordedDays.has(day))return;
  try{if(sessionStorage.getItem(sessionKey)==='ok')return;}catch{}
  if(pendingTrack)return pendingTrack;
  pendingTrack=(async()=>{
    let isUnique=true;
    try{isUnique=localStorage.getItem(uniqueKey)!=='ok';}catch{}
    try{
      await increaseDay(day,isUnique);
      recordedDays.add(day);
      try{sessionStorage.setItem(sessionKey,'ok');}catch{}
      if(isUnique)try{localStorage.setItem(uniqueKey,'ok');}catch{}
      reportVisitHealth(day,true,'방문 횟수가 Firestore에 저장됐습니다.');
    }catch(error){
      reportVisitHealth(day,false,error instanceof Error?error.message:'방문 기록에 실패했습니다.');
      throw error;
    }
  })();
  try{await pendingTrack;}finally{pendingTrack=null;}
}
