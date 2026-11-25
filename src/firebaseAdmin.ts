/// <reference types="vite/client" />
import { firebaseWebConfig } from './firebaseWebConfig';
/**
 * BRAMER admin-only Firebase REST adapter.
 * The Firebase web API key/project ID are public configuration, not credentials.
 * All data access must be enforced with Firestore Security Rules.
 */
export type BetaTester = {
  id: string;
  name: string;
  phone: string;
  occupation: string;
  registeredAt: string;
  lastActiveAt: string;
  projectCount: number;
  guidelineCount: number;
  status: string;
};
export type UsageEvent = {
  id: string;
  userId: string;
  event: string;
  createdAt: string;
  projectName: string;
  detail: string;
};
export type AdminSession = { email: string; uid: string; token: string };
type AuthResponse = { idToken?: string; localId?: string; email?: string; error?: { message?: string } };
type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};
type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};
type CollectionResponse = { documents?: FirestoreDocument[]; nextPageToken?: string };

export const firebaseProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseWebConfig.projectId).trim();
export const firebaseApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || firebaseWebConfig.apiKey).trim();
export const firebaseReady = Boolean(firebaseProjectId && firebaseApiKey);
const firestoreRoot = () =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/(default)/documents`;

function messageFromError(raw: string, status: number): string {
  const message = raw.toUpperCase();
  if (message.includes('OPERATION_NOT_ALLOWED') || message.includes('EMAIL_PASSWORD_SIGN_IN_DISABLED') || message.includes('PASSWORD_LOGIN_DISABLED'))
    return 'Firebase에서 이메일/비밀번호 로그인이 비활성화되어 있습니다. Authentication → 로그인 방법에서 이메일/비밀번호를 사용 설정해 주세요.';
  if (message.includes('INVALID_LOGIN_CREDENTIALS') || message.includes('INVALID_PASSWORD') || message.includes('EMAIL_NOT_FOUND') || message.includes('INVALID_EMAIL'))
    return 'Firebase Authentication에 생성된 관리자 계정의 이메일과 비밀번호가 맞는지 확인해 주세요.';
  if (message.includes('USER_DISABLED')) return 'Firebase에서 이 관리자 계정이 비활성화되어 있습니다.';
  if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) return '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.';
  if (message.includes('API_KEY_HTTP_REFERRER_BLOCKED') || message.includes('API_KEY_SERVICE_BLOCKED') || message.includes('API_KEY_INVALID') || message.includes('INVALID_API_KEY'))
    return 'Firebase Web API 키 제한 또는 프로젝트 연결 설정을 확인해 주세요.';
  if (message.includes('CONFIGURATION_NOT_FOUND') || message.includes('PROJECT_NOT_FOUND'))
    return 'Firebase Authentication 설정을 찾을 수 없습니다. 프로젝트와 로그인 방법 설정을 확인해 주세요.';
  if (message.includes('PERMISSION_DENIED') || status === 403)
    return 'Firestore 관리자 권한이 거부되었습니다. 최신 보안 규칙과 admins/{UID} 문서의 active=true를 확인해 주세요.';
  if (status === 401) return '관리자 인증이 만료되었습니다. 다시 로그인해 주세요.';
  if (status === 404) return '필요한 Firestore 문서를 찾지 못했습니다. admins/{UID} 관리자 문서가 생성되었는지 확인해 주세요.';
  if (status === 429) return 'Firebase 요청 횟수 제한에 걸렸습니다. 잠시 후 다시 시도해 주세요.';
  return `Firebase 요청에 실패했습니다 (HTTP ${status}). Authentication 로그인 설정과 관리자 권한을 확인해 주세요.`;
}
async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let response: Response;
    try { response = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' }); }
    catch { throw new Error(controller.signal.aborted ? 'Firebase 응답 시간이 초과되었습니다. 다시 시도해 주세요.' : 'Firebase 연결에 실패했습니다. 인터넷 연결과 브라우저의 요청 차단 설정을 확인해 주세요.'); }
    const payload = await response.json().catch(() => null) as (T & { error?: { message?: string; status?: string } }) | null;
    if (!response.ok) throw new Error(messageFromError(payload?.error?.message || payload?.error?.status || 'UNKNOWN', response.status));
    if (!payload || typeof payload !== 'object') throw new Error('Firebase 응답을 읽을 수 없습니다. 다시 시도해 주세요.');
    return payload;
  } finally { clearTimeout(timer); }
}
function value(field?: FirestoreValue): string | number | boolean {
  if (!field) return '';
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.integerValue !== undefined) return Number(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  return '';
}
const str = (record: Record<string, FirestoreValue>, key: string) => String(value(record[key]) || '');
const numeric = (record: Record<string, FirestoreValue>, key: string) => Number(value(record[key]) || 0);
const nameOf = (document: FirestoreDocument) => document.name.split('/').pop() || '';

async function authGET(url: string, token: string) {
  return jsonRequest<{ fields?: Record<string, FirestoreValue> }>(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  if (!firebaseReady) throw new Error('Firebase 연결 정보가 아직 설정되지 않았습니다.');
  const response = await jsonRequest<AuthResponse>(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseApiKey)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) },
  );
  if (!response.idToken || !response.localId || !response.email) throw new Error('로그인 응답이 올바르지 않습니다.');
  // A successful Firebase Auth login alone does not make this user an administrator.
  // This document must be manually provisioned; client writes are denied by rules.
  try {
    const profile = await authGET(
      `${firestoreRoot()}/admins/${encodeURIComponent(response.localId)}`,response.idToken,
    );
    if (value(profile.fields?.active) !== true)
      throw new Error('관리자 권한이 활성화되어 있지 않습니다.');
  } catch (error) {
    if (error instanceof Error && error.message === '관리자 권한이 활성화되어 있지 않습니다.') throw error;
    const reason = error instanceof Error ? error.message : '';
    if (reason.includes('문서를 찾지 못했습니다.')) {
      throw new Error('Firebase 로그인은 성공했지만 관리자 승인이 없습니다. Authentication에서 UID를 확인하고 Firestore에 admins/{UID} 문서를 생성한 뒤 active를 Boolean true로 저장해 주세요.');
    }
    if (reason.includes('권한이 거부되었습니다.')) {
      throw new Error('Firebase 로그인은 성공했지만 Firestore가 관리자 확인을 거부했습니다. admins/{UID}.active=true와 게시된 보안 규칙을 확인해 주세요.');
    }
    throw new Error('Firebase 로그인은 성공했지만 관리자 정보를 확인할 수 없습니다. Firestore 설정과 네트워크를 확인해 주세요.');
  }
  return { email: response.email, uid: response.localId, token: response.idToken };
}

async function getCollection(collection: string, token: string): Promise<FirestoreDocument[]> {
  let pageToken = '';
  const result: FirestoreDocument[] = [];
  for (let i=0; i<20; i++) {
    const params = new URLSearchParams({ pageSize: '100' });
    if (pageToken) params.set('pageToken',pageToken);
    const data = await jsonRequest<CollectionResponse>(
      `${firestoreRoot()}/${encodeURIComponent(collection)}?${params.toString()}`,
      { headers:{ Authorization:`Bearer ${token}` } },
    );
    result.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  if (pageToken) throw new Error('조회 가능한 데이터 범위를 초과했습니다. 전체 데이터를 표시할 수 없습니다.');
  return result;
}
export async function loadAdminData(session: AdminSession): Promise<{testers:BetaTester[];events:UsageEvent[]}> {
  const [testers, events] = await Promise.all([
    getCollection('betaTesters',session.token),
    getCollection('usageEvents',session.token),
  ]);
  return {
    testers:testers.map(doc => {
      const fields=doc.fields||{};
      return {
        id:nameOf(doc),name:str(fields,'name'),phone:str(fields,'phone'),
        occupation:str(fields,'occupation'),registeredAt:str(fields,'registeredAt'),
        lastActiveAt:str(fields,'lastActiveAt'),projectCount:numeric(fields,'projectCount'),
        guidelineCount:numeric(fields,'guidelineCount'),status:str(fields,'status')||'active',
      };
    }),
    events:events.map(doc => {
      const fields=doc.fields||{};
      return {
        id:nameOf(doc),userId:str(fields,'userId'),event:str(fields,'event'),
        createdAt:str(fields,'createdAt'),projectName:str(fields,'projectName'),
        detail:str(fields,'detail'),
      };
    }),
  };
}
