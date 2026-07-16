import type { ActivitySummary } from '../types/activity';

export interface PaceRecord {
  /** 秒/公里 */
  pace: number;
  /** 该段总耗时,秒 */
  duration: number;
  activityId: string;
  date: number;
}

export interface ValueRecord {
  value: number;
  activityId: string;
  date: number;
}

export interface PersonalRecords {
  fastest1k?: PaceRecord;
  fastest5k?: PaceRecord;
  fastest10k?: PaceRecord;
  longestDistance?: ValueRecord;
  longestDuration?: ValueRecord;
}

/** 完整公里段(尾段不足一公里的不算) */
const FULL_KM = 950;

/**
 * 从每公里分段滚动窗口找最快的连续 k 公里。
 * 分段是逐公里统计的,所以结果是"以公里边界对齐"的近似最佳成绩。
 */
function fastestWindow(
  activities: ActivitySummary[],
  k: number
): PaceRecord | undefined {
  let best: PaceRecord | undefined;
  for (const a of activities) {
    const splits = a.splits;
    for (let i = 0; i + k <= splits.length; i++) {
      let dist = 0;
      let dur = 0;
      let ok = true;
      for (let j = i; j < i + k; j++) {
        if (splits[j].distance < FULL_KM) {
          ok = false;
          break;
        }
        dist += splits[j].distance;
        dur += splits[j].duration;
      }
      if (!ok || dist <= 0) continue;
      const pace = (dur / dist) * 1000;
      if (!best || pace < best.pace) {
        best = { pace, duration: dur, activityId: a.id, date: a.startTime };
      }
    }
  }
  return best;
}

/** 个人纪录(只统计跑步类活动) */
export function computeRecords(items: ActivitySummary[]): PersonalRecords {
  const runs = items.filter((a) => a.sport === 'run');
  const records: PersonalRecords = {
    fastest1k: fastestWindow(runs, 1),
    fastest5k: fastestWindow(runs, 5),
    fastest10k: fastestWindow(runs, 10),
  };
  for (const a of runs) {
    if (!records.longestDistance || a.distance > records.longestDistance.value) {
      records.longestDistance = { value: a.distance, activityId: a.id, date: a.startTime };
    }
    if (!records.longestDuration || a.duration > records.longestDuration.value) {
      records.longestDuration = { value: a.duration, activityId: a.id, date: a.startTime };
    }
  }
  return records;
}
