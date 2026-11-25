import type { BrandProject } from '../types/guideline';
import type { GuidelineCategory, IndustryId } from '../engines/industryRecommendations';

export interface SavedBramerProject {
  id: string;
  updatedAt: number;
  project: BrandProject;
  industry: IndustryId;
  selectedCategories: GuidelineCategory[];
  enabled: Record<string, boolean>;
  step: number;
}

const DB_NAME = 'bramer-project-library';
const STORE = 'projects';
const VERSION = 1;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('이 브라우저는 프로젝트 저장을 지원하지 않습니다.')); return; }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    let expired = false;
    const timeout = window.setTimeout(() => {
      expired = true;
      reject(new Error('프로젝트 저장소 연결 시간이 초과되었습니다. 다른 BRAMER 탭을 닫고 다시 시도해 주세요.'));
    }, 8000);
    request.onblocked = () => { expired = true; window.clearTimeout(timeout); reject(new Error('다른 탭에서 프로젝트 저장소를 사용 중입니다.')); };
    request.onerror = () => { window.clearTimeout(timeout); reject(request.error ?? new Error('프로젝트 저장소를 열 수 없습니다.')); };
    request.onsuccess = () => {
      window.clearTimeout(timeout);
      if (expired) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transact<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    let tx: IDBTransaction;
    let request: IDBRequest<T>;
    try {
      tx = db.transaction(STORE, mode);
      request = fn(tx.objectStore(STORE));
    } catch (error) { db.close(); reject(error); return; }
    let value: T;
    request.onsuccess = () => { value = request.result; };
    request.onerror = () => reject(request.error ?? new Error('저장 중 오류가 발생했습니다.'));
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('프로젝트를 저장할 수 없습니다.')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('프로젝트 저장이 취소되었습니다.')); };
  });
}

export async function listSavedProjects(): Promise<SavedBramerProject[]> {
  const entries = await transact<SavedBramerProject[]>('readonly', store => store.getAll());
  return entries.filter(item => item && typeof item.id === 'string' && item.project && typeof item.project.name === 'string')
    .sort((a,b) => b.updatedAt - a.updatedAt);
}
// Serialize writes and deletes within this tab so older pending writes cannot
// overwrite a newer snapshot or resurrect a deleted project.
let writeTail: Promise<void> = Promise.resolve();
function queueWrite(operation: () => Promise<void>): Promise<void> {
  const pending = writeTail.then(operation);
  writeTail = pending.catch(() => {});
  return pending;
}
export function saveLocalProject(item: SavedBramerProject): Promise<void> {
  return queueWrite(async () => {
    await transact<IDBValidKey>('readwrite', store => store.put(item));
  });
}
export function deleteLocalProject(id: string): Promise<void> {
  return queueWrite(async () => {
    await transact<undefined>('readwrite', store => store.delete(id));
  });
}
export function newProjectId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `bramer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
