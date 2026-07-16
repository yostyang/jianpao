import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { Point, XUnit } from '@/lib/series';

const W = 640;
const H = 190;
const PAD_L = 8;
const PAD_R = 66;
const PAD_T = 12;
const PAD_B = 26;

interface Props {
  title: string;
  points: Point[];
  color: string;
  /** true 时数值越小画得越高(配速) */
  inverted?: boolean;
  /** y 轴与均值标注的格式化 */
  formatY: (v: number) => string;
  /** 均值(画虚线),不传则不画 */
  avg?: number;
  /** 横轴单位:km 或 min */
  xUnit: XUnit;
  /** 图表右上角的范围摘要 */
  rangeText?: (min: number, max: number) => string;
}

/** 选一个"好看"的 x 刻度步长,让刻度数落在 4~8 个 */
function tickStep(range: number): number {
  for (const s of [1, 2, 5, 10, 20, 30, 60]) {
    if (range / s <= 8) return s;
  }
  return 120;
}

/** 简约折线图:面积填充 + 均值虚线 + 距离/时间刻度 + 范围标注 */
export function LineChart({ title, points, color, inverted, formatY, avg, xUnit, rangeText }: Props) {
  const theme = useTheme();
  if (points.length < 2) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (avg != null) {
    minY = Math.min(minY, avg);
    maxY = Math.max(maxY, avg);
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const toX = (x: number) => PAD_L + ((x - minX) / spanX) * plotW;
  const toY = (y: number) => {
    const r = (y - minY) / spanY;
    const t = inverted ? r : 1 - r;
    return PAD_T + t * plotH;
  };

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)} ${toY(p.y).toFixed(1)}`)
    .join(' ');
  const bottomY = PAD_T + plotH;
  const area = `${line} L${toX(maxX).toFixed(1)} ${bottomY} L${toX(minX).toFixed(1)} ${bottomY} Z`;

  // x 轴刻度(从 0 或首个整数刻度开始)
  const step = tickStep(spanX);
  const ticks: number[] = [];
  for (let t = Math.ceil(minX / step) * step; t <= maxX + 1e-6; t += step) {
    // 避开左下角的单位标签
    if (toX(t) > PAD_L + 34) ticks.push(t);
  }

  // y 轴上下边界标注位置(inverted 时上下互换含义)
  const topLabel = inverted ? formatY(minY) : formatY(maxY);
  const bottomLabel = inverted ? formatY(maxY) : formatY(minY);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
        {rangeText ? (
          <Text style={[styles.range, { color: theme.textSecondary }]}>
            {rangeText(Math.min(...ys), Math.max(...ys))}
          </Text>
        ) : null}
      </View>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', aspectRatio: W / H }}>
        {/* 上下边界基准线 */}
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L + plotW} y2={PAD_T} stroke={theme.backgroundSelected} strokeWidth={1} />
        <Line x1={PAD_L} y1={bottomY} x2={PAD_L + plotW} y2={bottomY} stroke={theme.backgroundSelected} strokeWidth={1} />
        <SvgText x={W - PAD_R + 8} y={PAD_T + 5} fontSize={13} fill={theme.textSecondary}>
          {topLabel}
        </SvgText>
        <SvgText x={W - PAD_R + 8} y={bottomY + 5} fontSize={13} fill={theme.textSecondary}>
          {bottomLabel}
        </SvgText>

        <Path d={area} fill={color} opacity={0.08} />
        <Path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />

        {/* 均值虚线 */}
        {avg != null ? (
          <>
            <Line
              x1={PAD_L}
              y1={toY(avg)}
              x2={PAD_L + plotW}
              y2={toY(avg)}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="7 5"
              opacity={0.9}
            />
            <SvgText
              x={W - PAD_R + 8}
              y={toY(avg) + 5}
              fontSize={13}
              fontWeight="700"
              fill={color}>
              {formatY(avg)}
            </SvgText>
          </>
        ) : null}

        {/* x 轴刻度 */}
        {ticks.map((t, i) => (
          <SvgText
            key={i}
            x={toX(t)}
            y={H - 6}
            fontSize={12}
            fill={theme.textSecondary}
            textAnchor="middle">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </SvgText>
        ))}
        <SvgText x={PAD_L} y={H - 6} fontSize={12} fill={theme.textSecondary}>
          {xUnit}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 13, fontWeight: '600' },
  range: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
