/** Secure, one-time beta signup. Only the authenticated visitor can create their own record.
 * Firestore Rules must be deployed before enabling real beta registration.
 * Admin reads require a separately authorized Firebase account.
 */
import { firebaseWebConfig } from './firebaseWebConfig';
import { getAnonymousFirebaseIdentity } from './visitorStats';

export async function registerFirebaseBetaTester(name:string,phone:string,occupation:string):Promise<void>{
  const normalizedName=name.trim().normalize('NFC');
  const normalizedPhone=phone.replace(/\D/g,'');
  const normalizedOccupation=occupation.trim();
  if (!normalizedName || normalizedName.length>40 || !/^\d{9,11}$/.test(normalizedPhone)
    || !normalizedOccupation || normalizedOccupation.length>50) {
    throw new Error('성함, 연락처와 직업을 확인해 주세요.');
  }
  const {uid,token}=await getAnonymousFirebaseIdentity();
  const path=`https://firestore.googleapis.com/v1/projects/${firebaseWebConfig.projectId}/databases/(default)/documents/betaTesters?documentId=${encodeURIComponent(uid)}`;
  const body={fields:{
    uid:{stringValue:uid},
    name:{stringValue:normalizedName},
    phone:{stringValue:normalizedPhone},
    occupation:{stringValue:normalizedOccupation},
    registeredAt:{timestampValue:new Date().toISOString()},
    status:{stringValue:'active'},
  }};
  let response:Response;
  try {
    response=await fetch(path,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify(body),
    });
  }catch{throw new Error('네트워크 오류로 베타 신청을 저장하지 못했습니다. 다시 시도해 주세요.');}
  if(response.ok)return;
  const payload=await response.json().catch(()=>({})) as {error?:{status?:string;message?:string}};
  // Re-registering on the same browser should not overwrite another record.
  // The original record remains immutable by client design.
  if(response.status===409||payload.error?.status==='ALREADY_EXISTS')
    throw new Error('이 브라우저에서 이미 베타 신청이 완료되었습니다. 베타테스트 로그인을 이용해 주세요.');
  if(response.status===403||payload.error?.status==='PERMISSION_DENIED')
    throw new Error('Firebase 베타 등록 권한이 설정되지 않았습니다. 관리자에게 문의해 주세요.');
  throw new Error('베타 등록 정보 저장에 실패했습니다. ('+String(response.status)+')');
}

/** Re-verify the current anonymous Firebase user's own record without listing private signups. */
export async function verifyOwnFirebaseBetaTester(name:string,phone:string):Promise<{name:string;phone:string;occupation:string}|null>{
  const {uid,token}=await getAnonymousFirebaseIdentity();
  const url=`https://firestore.googleapis.com/v1/projects/${firebaseWebConfig.projectId}/databases/(default)/documents/betaTesters/${encodeURIComponent(uid)}`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
  if(response.status===404)return null;
  if(!response.ok)throw new Error('등록 정보 조회에 실패했습니다. ('+response.status+')');
  const doc=await response.json() as {fields?:Record<string,{stringValue?:string}>};
  const data=doc.fields||{};
  const registeredName=(data.name?.stringValue||'').trim().normalize('NFC');
  const registeredPhone=(data.phone?.stringValue||'').replace(/\D/g,'');
  if(registeredName.toLowerCase()!==name.trim().normalize('NFC').toLowerCase()
    ||registeredPhone!==phone.replace(/\D/g,'')
    ||data.status?.stringValue!=='active')return null;
  return {name:registeredName,phone:registeredPhone,occupation:data.occupation?.stringValue||''};
}

/** Minimal usage telemetry; no project names or personal contact details. */
export async function recordBetaUsage(event:'guideline_generated'|'export_svg'|'pdf_print_requested'):Promise<void>{
  const {uid,token}=await getAnonymousFirebaseIdentity();
  const url=`https://firestore.googleapis.com/v1/projects/${firebaseWebConfig.projectId}/databases/(default)/documents/usageEvents`;
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({fields:{userId:{stringValue:uid},event:{stringValue:event},createdAt:{timestampValue:new Date().toISOString()}}})});
  if(!response.ok)throw new Error('Usage recording failed: '+response.status);
}
