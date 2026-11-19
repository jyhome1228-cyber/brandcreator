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
function dayId(date=new Date()):string{
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function latestDays(count=7):string[]{
  const now=new Date();
  return Array.from({length:count},(_,i)=>dayId(new Date(now.getTime()-(count-1-i)*86400000)));
}
function readAuth():CachedAuth|null{
  try{const raw=localStorage.getItem(tokenStorage);return raw?JSON.parse(raw) as CachedAuth:null;}
  catch{return null;}
}
async function visitorToken():Promise<string>{
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
    try{localStorage.setItem(tokenStorage,JSON.stringify({
      idToken:token,refreshToken:String(payload.refreshToken||''),
      expiresAt:Date.now()+Math.max(60,Number(payload.expiresIn)||3600)*1000,
    } satisfies CachedAuth));}catch{}
    return token;
  })();
  try{return await pendingAuth;}finally{pendingAuth=null;}
}
type FirestoreDoc={name?:string;updateTime?:string;fields?:Record<string,{integerValue?:string;stringValue?:string}>};
function numberOf(doc:FirestoreDoc,key:string):number{return Number(doc.fields?.[key]?.integerValue||0);}
function firestoreDay(doc:FirestoreDoc):DailyVisits{
  return{day:String(doc.fields?.day?.stringValue||doc.name?.split('/').pop()||''),
    visits:numberOf(doc,'visits'),unique:numberOf(doc,'unique')};
}
export async function fetchDailyVisits():Promise<DailyVisits[]>{
  const rows:DailyVisits[]=[];
  let token='';
  for(let page=0;page<15;page++){
    const qs=new URLSearchParams({pageSize:'100'});
    if(token)qs.set('pageToken',token);
    const response=await fetch(`${root}/visitDaily?${qs.toString()}`,{cache:'no-store'});
    if(!response.ok){
      if(response.status===403)throw new Error('Firestore visitDaily 읽기 규칙을 게시해야 합니다.');
      throw new Error('방문자 통계를 불러오지 못했습니다.');
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
    const currentResponse=await fetch(url,{cache:'no-store'});
    if(!currentResponse.ok&&currentResponse.status!==404)throw new Error('방문자 집계 조회 권한을 확인해 주세요.');
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
    if(response.status===409||response.status===412)continue;
    const detail=await response.text().catch(()=>'');
    throw new Error(response.status===403?'Firestore 방문 기록 규칙과 익명 로그인을 확인해 주세요.':`방문 기록 실패: ${response.status} ${detail.slice(0,100)}`);
  }
  throw new Error('동시 방문 집계 충돌로 기록하지 못했습니다.');
}
export async function recordVisit():Promise<void>{
  if(typeof window==='undefined'||location.hash.startsWith('#/admin')||location.pathname.startsWith('/admin'))return;
  const day=dayId();
  const sessionKey=attemptPrefix+'session-'+day;
  const uniqueKey=attemptPrefix+'unique-'+day;
  try{if(sessionStorage.getItem(sessionKey)==='ok')return;}catch{}
  if(pendingTrack)return pendingTrack;
  pendingTrack=(async()=>{
    let isUnique=true;
    try{isUnique=localStorage.getItem(uniqueKey)!=='ok';}catch{}
    await increaseDay(day,isUnique);
    try{sessionStorage.setItem(sessionKey,'ok');}catch{}
    if(isUnique)try{localStorage.setItem(uniqueKey,'ok');}catch{}
  })();
  try{await pendingTrack;}finally{pendingTrack=null;}
}
