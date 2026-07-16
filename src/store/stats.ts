import type { ActivitySummary } from '../types/activity';

export interface PeriodStats {
  count: number;
  /** 米 */
  distance: number;
  /** 秒 */
  duration: number;
  /** 米 */
  elevGain: number;
}

export function sumStats(items: ActivitySummary[]): PeriodStats {
  return items.reduce(
    (acc, a) => ({
      count: acc.count + 1,
      distance: acc.distance + a.distance,
      duration: acc.duration + a.duration,
      elevGain: acc.elevGain + (a.elevGain ?? 0),
    }),
    { count: 0, distance: 0, duration: 0, elevGain: 0 }
  );
}

/** 本周一 00:00(本地时区) */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // 周一=0
  d.setDate(d.getDate() - dow);
  return d;
}

export function monthStart(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function inRange(items: ActivitySummary[], from: number, to: number = Infinity): ActivitySummary[] {
  return items.filter((a) => a.startTime >= from && a.startTime < to);
}

export interface WeekBar {
  /** 周一的日期 */
  start: Date;
  /** 如 6.23 */
  label: string;
  /** 米 */
  distance: number;
}

/** 最近 n 周的周跑量(含本周,时间升序) */
export function weeklySeries(items: ActivitySummary[], n: number, now: Date = new Date()): WeekBar[] {
  const thisWeek = weekStart(now).getTime();
  const WEEK = 7 * 24 * 3600 * 1000;
  const bars: WeekBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = thisWeek - i * WEEK;
    const d = new Date(start);
    bars.push({
      start: d,
      label: `${d.getMonth() + 1}.${d.getDate()}`,
      distance: sumStats(inRange(items, start, start + WEEK)).distance,
    });
  }
  return bars;
}

export interface MonthBar {
  year: number;
  /** 1~12 */
  month: number;
  /** 如 7月 或 25.7 (跨年时) */
  label: string;
  /** 米 */
  distance: number;
}

/** 最近 n 个月的月跑量(含本月,时间升序) */
export function monthlySeries(items: ActivitySummary[], n: number, now: Date = new Date()): MonthBar[] {
  const bars: MonthBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = d.getTime();
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const crossYear = d.getFullYear() !== now.getFullYear();
    bars.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: crossYear ? `${d.getFullYear() % 100}.${d.getMonth() + 1}` : `${d.getMonth() + 1}月`,
      distance: sumStats(inRange(items, from, to)).distance,
    });
  }
  return bars;
}

/** 某一年 1~12 月的月跑量 */
export function yearMonthly(items: ActivitySummary[], year: number): MonthBar[] {
  const bars: MonthBar[] = [];
  for (let m = 0; m < 12; m++) {
    const from = new Date(year, m, 1).getTime();
    const to = new Date(year, m + 1, 1).getTime();
    bars.push({
      year,
      month: m + 1,
      label: `${m + 1}月`,
      distance: sumStats(inRange(items, from, to)).distance,
    });
  }
  return bars;
}

/** 每日跑量映射:'2026-07-02' → 米(热力图用) */
export function dayTotals(items: ActivitySummary[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of items) {
    const d = new Date(a.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + a.distance);
  }
  return map;
}
