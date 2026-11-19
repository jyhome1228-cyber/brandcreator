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

function messageFromError(message: string) {
  if (message.includes('PERMISSION_DENIED')) return '관리자 권한이 없거나 Firestore 보안 규칙에서 접근을 허용하지 않았습니다.';
  if (message.includes('INVALID_LOGIN_CREDENTIALS') || message.includes('INVALID_PASSWORD') || message.includes('EMAIL_NOT_FOUND'))
    return '이메일 또는 비밀번호를 확인해 주세요.';
  if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) return '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.';
  if (message.includes('INVALID_API_KEY')) return 'Firebase Web API 키 설정을 확인해 주세요.';
  return 'Firebase 요청에 실패했습니다. 관리자 설정 또는 네트워크 상태를 확인해 주세요.';
}
async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(messageFromError(payload.error?.message || 'UNKNOWN'));
  return payload;
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
    throw new Error('관리자로 승인된 Firebase 계정이 아닙니다. 관리자 UID 문서와 Firestore 규칙을 확인해 주세요.');
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
