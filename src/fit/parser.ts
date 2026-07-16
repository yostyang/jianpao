import { Decoder, Stream } from '@garmin/fitsdk';

import type { ParsedActivity, Sample, Split, SportType } from '../types/activity';

/** semicircles → 度 */
const SEMI = 180 / 2 ** 31;

const SPORT_MAP: Record<string, SportType> = {
  running: 'run',
  trailRunning: 'run',
  trail_running: 'run',
  treadmill: 'run',
  track: 'run',
  walking: 'walk',
  hiking: 'walk',
  cycling: 'ride',
  training: 'strength',
  strengthTraining: 'strength',
  strength_training: 'strength',
  fitnessEquipment: 'strength',
  fitness_equipment: 'strength',
};

const SPORT_LABEL: Record<SportType, string> = {
  run: '跑步',
  walk: '徒步',
  ride: '骑行',
  strength: '力量训练',
  other: '运动',
};

/** 按开始时段给活动起名,如「夜跑 · 8.2 公里」 */
function activityName(sport: SportType, startTime: number, distance: number): string {
  const hour = new Date(startTime).getHours();
  let prefix = SPORT_LABEL[sport];
  if (sport === 'run') {
    if (hour >= 5 && hour < 10) prefix = '晨跑';
    else if (hour >= 10 && hour < 14) prefix = '午间跑';
    else if (hour >= 14 && hour < 18) prefix = '下午跑';
    else if (hour >= 18 && hour < 23) prefix = '夜跑';
    else prefix = '深夜跑';
  }
  if (distance >= 100 && sport !== 'strength') {
    return `${prefix} · ${(distance / 1000).toFixed(distance >= 10000 ? 1 : 2)} 公里`;
  }
  return prefix;
}

/** 跑步步频:FIT 记录的是单脚 rpm,换算成双脚步/分 */
function runCadence(cadence?: number, fractional?: number): number | undefined {
  if (cadence == null) return undefined;
  return Math.round((cadence + (fractional ?? 0)) * 2);
}

/** 海拔序列轻度平滑后累计正向爬升 */
function computeElevGain(samples: Sample[]): number | undefined {
  const alts = samples.filter((s) => s.alt != null).map((s) => s.alt as number);
  if (alts.length < 10) return undefined;
  const win = 5;
  let gain = 0;
  let prev: number | null = null;
  for (let i = 0; i < alts.length; i++) {
    const lo = Math.max(0, i - win);
    const hi = Math.min(alts.length, i + win + 1);
    let sum = 0;
    for (let j = lo; j < hi; j++) sum += alts[j];
    const smoothed = sum / (hi - lo);
    if (prev != null && smoothed > prev) gain += smoothed - prev;
    prev = smoothed;
  }
  return Math.round(gain);
}

/** 从采样点算每公里分段(时间在公里界点做线性插值) */
function computeSplits(samples: Sample[]): Split[] {
  const pts = samples.filter((s) => s.dist != null);
  if (pts.length < 2) return [];
  const total = pts[pts.length - 1].dist as number;
  if (total < 100) return [];

  const splits: Split[] = [];
  let boundary = 1000;
  let segStartT = pts[0].t;
  let segStartDist = pts[0].dist as number;
  let hrSum = 0;
  let hrCount = 0;
  let lastAlt: number | null = null;
  let elevGain = 0;

  const push = (endT: number, endDist: number) => {
    const distance = endDist - segStartDist;
    const duration = endT - segStartT;
    if (distance < 50 || duration <= 0) return;
    splits.push({
      index: splits.length + 1,
      distance: Math.round(distance),
      duration: Math.round(duration),
      pace: Math.round((duration / distance) * 1000),
      avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : undefined,
      elevGain: Math.round(elevGain),
    });
  };

  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const d = p.dist as number;
    if (p.hr != null) {
      hrSum += p.hr;
      hrCount++;
    }
    if (p.alt != null) {
      if (lastAlt != null && p.alt > lastAlt) elevGain += p.alt - lastAlt;
      lastAlt = p.alt;
    }
    while (d >= boundary) {
      const prevP = pts[i - 1];
      const prevD = prevP.dist as number;
      // 在 prevP 与 p 之间线性插值出到达公里界点的时刻
      const ratio = d > prevD ? (boundary - prevD) / (d - prevD) : 1;
      const tAtBoundary = prevP.t + (p.t - prevP.t) * ratio;
      push(tAtBoundary, boundary);
      segStartT = tAtBoundary;
      segStartDist = boundary;
      hrSum = 0;
      hrCount = 0;
      elevGain = 0;
      boundary += 1000;
    }
  }
  // 最后不足一公里的尾段
  push(pts[pts.length - 1].t, total);
  return splits;
}

/**
 * 解析 FIT 文件为内部活动模型。
 * 只依赖 DataView,Node / React Native / Web 通用。
 */
export function parseFit(data: ArrayBuffer): ParsedActivity {
  const stream = Stream.fromArrayBuffer(data);
  const decoder = new Decoder(stream);
  if (!decoder.isFIT()) throw new Error('不是有效的 FIT 文件');

  // fitsdk 的类型声明按原始数值标注,但默认解码选项会把枚举转字符串、时间戳转 Date,
  // 与声明不符,这里按运行时实际形态处理
  const { messages, errors } = decoder.read() as { messages: any; errors: any[] };
  if (errors?.length && !messages.recordMesgs?.length && !messages.sessionMesgs?.length) {
    throw new Error(`FIT 解析失败: ${errors[0]?.message ?? errors[0]}`);
  }

  const session = messages.sessionMesgs?.[0];
  const records = messages.recordMesgs ?? [];
  const sportRaw: string | undefined = session?.sport ?? messages.sportMesgs?.[0]?.sport;
  const sport: SportType = SPORT_MAP[sportRaw ?? ''] ?? 'other';
  const isRun = sport === 'run' || sport === 'walk';

  const startDate: Date | undefined =
    session?.startTime ?? records[0]?.timestamp ?? messages.activityMesgs?.[0]?.timestamp;
  if (!startDate) throw new Error('FIT 文件缺少时间信息');
  const startMs = startDate.getTime();

  const samples: Sample[] = [];
  for (const r of records) {
    if (!(r.timestamp instanceof Date)) continue;
    const s: Sample = { t: Math.round((r.timestamp.getTime() - startMs) / 1000) };
    if (r.positionLat != null && r.positionLong != null) {
      s.lat = r.positionLat * SEMI;
      s.lng = r.positionLong * SEMI;
    }
    const alt = r.enhancedAltitude ?? r.altitude;
    if (alt != null) s.alt = Math.round(alt * 10) / 10;
    if (r.heartRate != null) s.hr = r.heartRate;
    const cad = isRun ? runCadence(r.cadence, r.fractionalCadence) : r.cadence;
    if (cad != null) s.cad = cad;
    const speed = r.enhancedSpeed ?? r.speed;
    if (speed != null) s.speed = Math.round(speed * 1000) / 1000;
    if (r.distance != null) s.dist = Math.round(r.distance * 10) / 10;
    samples.push(s);
  }

  const lastDist = [...samples].reverse().find((s) => s.dist != null)?.dist;
  const distance: number = Math.round(session?.totalDistance ?? lastDist ?? 0);
  const duration: number = Math.round(
    session?.totalTimerTime ?? (samples.length ? samples[samples.length - 1].t : 0)
  );
  const elapsed: number = Math.round(session?.totalElapsedTime ?? duration);

  const hrs = samples.filter((s) => s.hr != null).map((s) => s.hr as number);
  const avgHr: number | undefined =
    session?.avgHeartRate ??
    (hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : undefined);
  const maxHr: number | undefined =
    session?.maxHeartRate ?? (hrs.length ? Math.max(...hrs) : undefined);

  const avgCadence = isRun
    ? runCadence(session?.avgCadence, session?.avgFractionalCadence) ??
      (() => {
        const cads = samples.filter((s) => s.cad != null && s.cad > 0).map((s) => s.cad as number);
        return cads.length
          ? Math.round(cads.reduce((a, b) => a + b, 0) / cads.length)
          : undefined;
      })()
    : session?.avgCadence || undefined;

  const validHrs = hrs.filter((h) => h > 30);
  const minHr: number | undefined = validHrs.length ? Math.min(...validHrs) : undefined;

  const elevGain: number | undefined =
    session?.totalAscent ?? computeElevGain(samples);
  const descent: number | undefined = session?.totalDescent;

  // 平均步幅 = 距离 ÷ 总步数(总步数用双脚步频 × 时长推算,不依赖厂商 totalStrides 口径)
  const strideLen: number | undefined =
    isRun && avgCadence && duration > 0 && distance >= 100
      ? Math.round((distance / (avgCadence * (duration / 60))) * 100) / 100
      : undefined;

  // ACSM 平地跑/走 VO2 公式估算 METs
  const mets: number | undefined =
    isRun && duration > 0 && distance >= 100
      ? Math.round(((0.2 * ((distance / duration) * 60) + 3.5) / 3.5) * 10) / 10
      : undefined;

  const splits = computeSplits(samples);
  const hasTrack = samples.some((s) => s.lat != null);

  return {
    summary: {
      sport,
      sportRaw,
      name: activityName(sport, startMs, distance),
      startTime: startMs,
      duration,
      elapsed,
      distance,
      avgPace: distance >= 100 && duration > 0 ? Math.round((duration / distance) * 1000) : undefined,
      avgHr,
      maxHr,
      minHr,
      avgCadence,
      strideLen,
      mets,
      elevGain,
      descent,
      calories: session?.totalCalories,
      splits,
      hasTrack,
    },
    samples,
  };
}

/** 配速格式化:秒/公里 → 5'32" */
export function formatPace(secPerKm?: number): string {
  if (!secPerKm || !isFinite(secPerKm)) return "--'--\"";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

/** 时长格式化:秒 → 1:02:03 或 42:10 */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 距离格式化:米 → 8.21 km / 950 m */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}
