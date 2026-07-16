/** 配速渐变:慢 → 快(轨迹着色共用) */
const SLOW_RGB = [255, 199, 184] as const;
const FAST_RGB = [214, 49, 14] as const;

export function lerpColor(t: number): string {
  const c = SLOW_RGB.map((s, i) => Math.round(s + (FAST_RGB[i] - s) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** 取分位数(数组会被排序拷贝) */
export function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

/**
 * 给轨迹点生成配速渐变色(p15~p85 分位归一化,避免极值拉偏)。
 * 速度覆盖不足一半时返回 null(调用方退回单色)。
 */
export function paceColors(points: { speed?: number }[]): string[] | null {
  const speeds = points
    .map((p) => p.speed)
    .filter((v): v is number => v != null && v > 0.55);
  if (speeds.length < points.length * 0.5) return null;
  const lo = quantile(speeds, 0.15);
  const hi = Math.max(quantile(speeds, 0.85), lo + 0.01);
  let last = 0.5;
  return points.map((p) => {
    if (p.speed != null) last = Math.max(0, Math.min(1, (p.speed - lo) / (hi - lo)));
    return lerpColor(last);
  });
}
