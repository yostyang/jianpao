import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import type { ActivitySummary, ParsedActivity, Sample } from '../types/activity';
import { isDuplicate, type ActivityRepo, type InsertOptions, type InsertResult } from './types';

let db: SQLite.SQLiteDatabase | null = null;

function samplesDir(): Directory {
  return new Directory(Paths.document, 'samples');
}

function samplesFile(id: string): File {
  return new File(samplesDir(), `${id}.json`);
}

async function ensureDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('jianpao.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      start_time INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      source TEXT NOT NULL,
      external_id TEXT,
      fit_hash TEXT,
      json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_time DESC);
  `);
  samplesDir().create({ intermediates: true, idempotent: true });
  return db;
}

const nativeRepo: ActivityRepo = {
  async init() {
    await ensureDb();
  },

  async insert(parsed: ParsedActivity, opts: InsertOptions): Promise<InsertResult> {
    const d = await ensureDb();
    // 只取时间窗口附近 + 同哈希的候选做去重比较
    const candidates = await d.getAllAsync<{ start_time: number; duration: number; fit_hash: string | null }>(
      'SELECT start_time, duration, fit_hash FROM activities WHERE ABS(start_time - ?) < 120000 OR (fit_hash IS NOT NULL AND fit_hash = ?)',
      [parsed.summary.startTime, opts.fitHash ?? '']
    );
    const dup = isDuplicate(
      candidates.map((c) => ({
        startTime: c.start_time,
        duration: c.duration,
        fitHash: c.fit_hash ?? undefined,
      })),
      { fitHash: opts.fitHash, startTime: parsed.summary.startTime, duration: parsed.summary.duration }
    );
    if (dup) return { status: 'duplicate', reason: dup };

    const summary: ActivitySummary = {
      ...parsed.summary,
      id: Crypto.randomUUID(),
      source: opts.source,
      externalId: opts.externalId,
      fitHash: opts.fitHash,
    };
    samplesFile(summary.id).write(JSON.stringify(parsed.samples));
    await d.runAsync(
      'INSERT INTO activities (id, start_time, duration, source, external_id, fit_hash, json) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        summary.id,
        summary.startTime,
        summary.duration,
        summary.source,
        summary.externalId ?? null,
        summary.fitHash ?? null,
        JSON.stringify(summary),
      ]
    );
    return { status: 'inserted', summary };
  },

  async update(summary: ActivitySummary): Promise<void> {
    const d = await ensureDb();
    await d.runAsync('UPDATE activities SET json = ? WHERE id = ?', [
      JSON.stringify(summary),
      summary.id,
    ]);
  },

  async list(): Promise<ActivitySummary[]> {
    const d = await ensureDb();
    const rows = await d.getAllAsync<{ json: string }>(
      'SELECT json FROM activities ORDER BY start_time DESC'
    );
    return rows.map((r) => JSON.parse(r.json));
  },

  async get(id: string): Promise<ActivitySummary | null> {
    const d = await ensureDb();
    const row = await d.getFirstAsync<{ json: string }>(
      'SELECT json FROM activities WHERE id = ?',
      [id]
    );
    return row ? JSON.parse(row.json) : null;
  },

  async getSamples(id: string): Promise<Sample[]> {
    const f = samplesFile(id);
    if (!f.exists) return [];
    return JSON.parse(await f.text());
  },

  async remove(id: string): Promise<void> {
    const d = await ensureDb();
    await d.runAsync('DELETE FROM activities WHERE id = ?', [id]);
    const f = samplesFile(id);
    if (f.exists) f.delete();
  },
};

export const activityRepo = nativeRepo;
