import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { firebaseWebConfig } from './firebaseWebConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseWebConfig);
const auth = getAuth(app);
let verifier: RecaptchaVerifier | undefined;
let confirmation: ConfirmationResult | undefined;

export function normalizeKoreanMobile(phone: string): { local: string; e164: string } {
  const local = phone.replace(/\D/g, '');
  if (!/^010\d{8}$/.test(local)) throw new Error('휴대전화 번호는 010으로 시작하는 11자리로 입력해 주세요.');
  return { local, e164: '+82' + local.slice(1) };
}

function authError(error: unknown): Error {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('operation-not-allowed')) return new Error('Firebase Authentication에서 전화번호 로그인 제공업체를 활성화해 주세요.');
  if (code.includes('invalid-app-credential') || code.includes('captcha')) return new Error('휴대전화 인증 확인에 실패했습니다. 인증 도메인과 reCAPTCHA 설정을 확인해 주세요.');
  if (code.includes('too-many-requests') || code.includes('quota-exceeded')) return new Error('인증 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
  if (code.includes('invalid-verification-code')) return new Error('인증번호가 일치하지 않습니다.');
  if (code.includes('code-expired')) return new Error('인증번호가 만료됐습니다. 다시 전송해 주세요.');
  return new Error('휴대전화 인증에 실패했습니다. ' + code);
}

export async function sendBetaVerification(phone: string): Promise<void> {
  const { e164 } = normalizeKoreanMobile(phone);
  confirmation = undefined;
  try {
    if (!verifier) verifier = new RecaptchaVerifier(auth, 'bramer-phone-recaptcha', { size: 'invisible' });
    await verifier.render();
    confirmation = await signInWithPhoneNumber(auth, e164, verifier);
  } catch (error) {
    verifier?.clear();
    verifier = undefined;
    throw authError(error);
  }
}

export async function confirmBetaVerification(code: string): Promise<{ uid: string; idToken: string; phone: string }> {
  if (!confirmation) throw new Error('먼저 인증번호를 전송해 주세요.');
  try {
    const credential = await confirmation.confirm(code.trim());
    const user = credential.user;
    if (!user.phoneNumber) throw new Error('인증된 전화번호가 없습니다.');
    return { uid: user.uid, idToken: await user.getIdToken(), phone: user.phoneNumber };
  } catch (error) { throw authError(error); }
}

type BetaRecord = { uid: string; name: string; phone: string; occupation: string; registeredAt: string; status: string; verifiedPhone?: string };
const root = 'https://firestore.googleapis.com/v1/projects/' + firebaseWebConfig.projectId + '/databases/(default)/documents/betaTesters';
type FirestoreDoc = { fields?: Record<string, { stringValue?: string; timestampValue?: string }> };
function fromFirestore(doc: FirestoreDoc): BetaRecord {
  const fields = doc.fields || {};
  const value = (field: string) => fields[field]?.stringValue || '';
  return { uid: value('uid'), name: value('name'), phone: value('phone'), occupation: value('occupation'),
    registeredAt: fields.registeredAt?.timestampValue || '', status: value('status'), verifiedPhone: value('verifiedPhone') };
}
export async function readVerifiedBeta(identity: { uid: string; idToken: string }): Promise<BetaRecord | null> {
  const response = await fetch(root + '/' + encodeURIComponent(identity.uid), { headers: { Authorization: 'Bearer ' + identity.idToken }, cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Firebase 가입 기록 조회에 실패했습니다. (' + response.status + ')');
  return fromFirestore(await response.json() as FirestoreDoc);
}

export async function registerVerifiedBeta(identity: { uid: string; idToken: string; phone: string }, name: string, occupation: string): Promise<void> {
  const normalized = normalizeKoreanMobile(identity.phone.replace(/^\+82/, '0')).local;
  const cleanName = name.trim().normalize('NFC');
  const cleanOccupation = occupation.trim();
  if (!cleanName || cleanName.length > 40 || !cleanOccupation || cleanOccupation.length > 50) throw new Error('성함과 직업을 확인해 주세요.');
  const fields = {
    uid: { stringValue: identity.uid },
    name: { stringValue: cleanName },
    phone: { stringValue: normalized },
    occupation: { stringValue: cleanOccupation },
    registeredAt: { timestampValue: new Date().toISOString() },
    status: { stringValue: 'active' },
    verifiedPhone: { stringValue: identity.phone },
  };
  const response = await fetch(root + '?documentId=' + encodeURIComponent(identity.uid), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + identity.idToken },
    body: JSON.stringify({ fields }),
  });
  if (response.status === 409) throw new Error('이미 가입된 휴대전화입니다. 베타테스트 로그인을 이용해 주세요.');
  if (!response.ok) throw new Error('가입 정보 저장 권한이 없습니다. Firebase 규칙 게시 상태를 확인해 주세요. (' + response.status + ')');
}

export async function recoverLegacyBeta(identity: { uid: string; idToken: string }, name: string): Promise<BetaRecord | null> {
  // Privileged matching of legacy anonymous records is only done by the server after phone OTP verification.
  const url = 'https://asia-northeast3-' + firebaseWebConfig.projectId + '.cloudfunctions.net/recoverBetaAccount';
  let response: Response;
  try { response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + identity.idToken }, body: JSON.stringify({ name: name.trim().normalize('NFC') }) }); }
  catch { return null; } // Migration endpoint may not be deployed yet.
  if (response.status === 404 || response.status === 503) return null;
  if (response.status === 401 || response.status === 403) throw new Error('휴대전화 본인 인증을 확인하지 못했습니다.');
  if (!response.ok) return null;
  const payload = await response.json() as { recovered?: boolean };
  return payload.recovered ? readVerifiedBeta(identity) : null;
}
