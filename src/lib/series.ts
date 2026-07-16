import type { Sample } from '../types/activity';

export interface Point {
  x: number;
  y: number;
}

export type XUnit = 'km' | 'min';

/** 时序图横轴:大部分采样点带距离就用公里,否则用分钟 */
export function xUnitOf(samples: Sample[]): XUnit {
  if (samples.length === 0) return 'min';
  const withDist = samples.filter((s) => s.dist != null).length;
  return withDist / samples.length > 0.8 ? 'km' : 'min';
}

function xOf(s: Sample, unit: XUnit): number {
  return unit === 'km' ? (s.dist ?? 0) / 1000 : s.t / 60;
}

/** 分桶均值降采样到最多 n 个点(时序图去噪 + 控制渲染量) */
export function downsample(points: Point[], n: number): Point[] {
  if (points.length <= n) return points;
  const bucketSize = points.length / n;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const lo = Math.floor(i * bucketSize);
    const hi = Math.min(points.length, Math.floor((i + 1) * bucketSize));
    if (hi <= lo) continue;
    let sx = 0;
    let sy = 0;
    for (let j = lo; j < hi; j++) {
      sx += points[j].x;
      sy += points[j].y;
    }
    out.push({ x: sx / (hi - lo), y: sy / (hi - lo) });
  }
  return out;
}

/** 配速序列:先对速度降采样去噪,再转秒/公里(速度过低视为暂停,跳过);
 *  短暂停留造成的极慢配速会把纵轴拉扁,按 p90×1.3 截断 */
export function paceSeries(samples: Sample[], unit: XUnit, n = 240): Point[] {
  const speedPts = samples
    .filter((s) => s.speed != null && (s.speed as number) > 0.55 && (unit !== 'km' || s.dist != null))
    .map((s) => ({ x: xOf(s, unit), y: s.speed as number }));
  const paces = downsample(speedPts, n).map((p) => ({ x: p.x, y: 1000 / p.y }));
  if (paces.length < 5) return paces;
  const sorted = paces.map((p) => p.y).sort((a, b) => a - b);
  const cap = sorted[Math.floor(sorted.length * 0.9)] * 1.3;
  return paces.map((p) => ({ x: p.x, y: Math.min(p.y, cap) }));
}

/** 速度序列(骑行用),km/h */
export function speedSeries(samples: Sample[], unit: XUnit, n = 240): Point[] {
  return downsample(
    samples
      .filter((s) => s.speed != null && (s.speed as number) > 0.55 && (unit !== 'km' || s.dist != null))
      .map((s) => ({ x: xOf(s, unit), y: (s.speed as number) * 3.6 })),
    n
  );
}

export function hrSeries(samples: Sample[], unit: XUnit, n = 240): Point[] {
  // 过滤传感器掉线的 0 值/异常低值
  return downsample(
    samples
      .filter((s) => s.hr != null && s.hr > 30 && (unit !== 'km' || s.dist != null))
      .map((s) => ({ x: xOf(s, unit), y: s.hr as number })),
    n
  );
}

export function cadSeries(samples: Sample[], unit: XUnit, n = 240): Point[] {
  // 过滤停下时的 0 步频
  return downsample(
    samples
      .filter((s) => s.cad != null && s.cad > 60 && (unit !== 'km' || s.dist != null))
      .map((s) => ({ x: xOf(s, unit), y: s.cad as number })),
    n
  );
}

export function elevSeries(samples: Sample[], unit: XUnit, n = 240): Point[] {
  return downsample(
    samples
      .filter((s) => s.alt != null && (unit !== 'km' || s.dist != null))
      .map((s) => ({ x: xOf(s, unit), y: s.alt as number })),
    n
  );
}
