import type { ActivitySource, ActivitySummary, ParsedActivity, Sample } from '../types/activity';

export interface InsertOptions {
  source: ActivitySource;
  externalId?: string;
  fitHash?: string;
}

export type InsertResult =
  | { status: 'inserted'; summary: ActivitySummary }
  | { status: 'duplicate'; reason: 'hash' | 'time' };

/** 活动仓库统一接口:原生端 SQLite + 文件,web 端 IndexedDB */
export interface ActivityRepo {
  init(): Promise<void>;
  insert(parsed: ParsedActivity, opts: InsertOptions): Promise<InsertResult>;
  /** 覆盖更新活动摘要(如回填地区) */
  update(summary: ActivitySummary): Promise<void>;
  list(): Promise<ActivitySummary[]>;
  get(id: string): Promise<ActivitySummary | null>;
  getSamples(id: string): Promise<Sample[]>;
  remove(id: string): Promise<void>;
}

/** 去重:内容哈希相同,或开始时间差 2 分钟内且时长差 5% 以内(跨来源同一次运动) */
export function isDuplicate(
  existing: Pick<ActivitySummary, 'fitHash' | 'startTime' | 'duration'>[],
  candidate: { fitHash?: string; startTime: number; duration: number }
): 'hash' | 'time' | null {
  for (const e of existing) {
    if (candidate.fitHash && e.fitHash && e.fitHash === candidate.fitHash) return 'hash';
    if (
      Math.abs(e.startTime - candidate.startTime) < 120_000 &&
      Math.abs(e.duration - candidate.duration) <= Math.max(60, candidate.duration * 0.05)
    ) {
      return 'time';
    }
  }
  return null;
}
