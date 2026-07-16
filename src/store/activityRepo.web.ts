// Web 端(开发预览)兜底实现:IndexedDB 存元数据与采样点
import * as Crypto from 'expo-crypto';

import type { ActivitySummary, ParsedActivity, Sample } from '../types/activity';
import { isDuplicate, type ActivityRepo, type InsertOptions, type InsertResult } from './types';

const DB_NAME = 'jianpao';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('activities')) d.createObjectStore('activities', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('samples')) d.createObjectStore('samples');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(d.transaction(store, mode).objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

const webRepo: ActivityRepo = {
  async init() {
    await openDb();
  },

  async insert(parsed: ParsedActivity, opts: InsertOptions): Promise<InsertResult> {
    const all = await this.list();
    const dup = isDuplicate(all, {
      fitHash: opts.fitHash,
      startTime: parsed.summary.startTime,
      duration: parsed.summary.duration,
    });
    if (dup) return { status: 'duplicate', reason: dup };

    const summary: ActivitySummary = {
      ...parsed.summary,
      id: Crypto.randomUUID(),
      source: opts.source,
      externalId: opts.externalId,
      fitHash: opts.fitHash,
    };
    await tx('samples', 'readwrite', (s) => s.put(parsed.samples, summary.id));
    await tx('activities', 'readwrite', (s) => s.put(summary));
    return { status: 'inserted', summary };
  },

  async update(summary: ActivitySummary): Promise<void> {
    await tx('activities', 'readwrite', (s) => s.put(summary));
  },

  async list(): Promise<ActivitySummary[]> {
    const all = await tx<ActivitySummary[]>('activities', 'readonly', (s) => s.getAll());
    return all.sort((a, b) => b.startTime - a.startTime);
  },

  async get(id: string): Promise<ActivitySummary | null> {
    const row = await tx<ActivitySummary | undefined>('activities', 'readonly', (s) => s.get(id));
    return row ?? null;
  },

  async getSamples(id: string): Promise<Sample[]> {
    const rows = await tx<Sample[] | undefined>('samples', 'readonly', (s) => s.get(id));
    return rows ?? [];
  },

  async remove(id: string): Promise<void> {
    await tx('activities', 'readwrite', (s) => s.delete(id));
    await tx('samples', 'readwrite', (s) => s.delete(id));
  },
};

export const activityRepo = webRepo;
