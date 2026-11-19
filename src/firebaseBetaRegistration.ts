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
