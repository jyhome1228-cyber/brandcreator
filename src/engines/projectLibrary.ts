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
    request.onerror = () => reject(request.error ?? new Error('프로젝트 저장소를 열 수 없습니다.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
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
export async function saveLocalProject(item: SavedBramerProject): Promise<void> {
  await transact<IDBValidKey>('readwrite', store => store.put(item));
}
export async function deleteLocalProject(id: string): Promise<void> {
  await transact<undefined>('readwrite', store => store.delete(id));
}
export function newProjectId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `bramer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
