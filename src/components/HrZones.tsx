import { StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/fit/parser';
import { useTheme } from '@/hooks/use-theme';
import type { Sample } from '@/types/activity';

/** 通用五区配色:Z1 灰 → Z5 红 */
const ZONES = [
  { key: 'Z1', label: '热身', from: 0.0, to: 0.6, color: '#9AA5B1' },
  { key: 'Z2', label: '轻松', from: 0.6, to: 0.7, color: '#4C9AFF' },
  { key: 'Z3', label: '有氧', from: 0.7, to: 0.8, color: '#36B37E' },
  { key: 'Z4', label: '乳酸阈', from: 0.8, to: 0.9, color: '#FFAB00' },
  { key: 'Z5', label: '无氧', from: 0.9, to: 10, color: '#E14D64' },
] as const;

interface Props {
  samples: Sample[];
  /** 用于划分区间的最大心率(通常取历史最高) */
  hrMax: number;
}

/** 心率区间分布:各区间累计时长的横条图 */
export function HrZones({ samples, hrMax }: Props) {
  const theme = useTheme();
  const pts = samples.filter((s) => s.hr != null && s.hr > 30);
  if (pts.length < 10 || hrMax <= 0) return null;

  const seconds = ZONES.map(() => 0);
  for (let i = 1; i < pts.length; i++) {
    // 相邻采样间隔作为该心率的持续时间,暂停造成的大间隔截断到 10s
    const dt = Math.min(pts[i].t - pts[i - 1].t, 10);
    if (dt <= 0) continue;
    const ratio = (pts[i].hr as number) / hrMax;
    const zi = ZONES.findIndex((z) => ratio >= z.from && ratio < z.to);
    if (zi >= 0) seconds[zi] += dt;
  }
  const total = seconds.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const maxSec = Math.max(...seconds);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>心率区间</Text>
        <Text style={[styles.caption, { color: theme.textSecondary }]}>按估算最高心率 {hrMax} 划分</Text>
      </View>
      {ZONES.map((z, i) => {
        const pct = seconds[i] / total;
        const barPct = maxSec > 0 ? Math.max((seconds[i] / maxSec) * 100, seconds[i] > 0 ? 3 : 0) : 0;
        const bpmRange =
          z.to > 2
            ? `${Math.round(z.from * hrMax)}+`
            : `${Math.round(z.from * hrMax)}-${Math.round(z.to * hrMax)}`;
        return (
          <View key={z.key} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={[styles.zone, { color: theme.text }]}>{z.key}</Text>
              <Text style={[styles.zoneSub, { color: theme.textSecondary }]}>
                {z.label} {bpmRange}
              </Text>
            </View>
            <View style={styles.barZone}>
              <View style={[styles.bar, { width: `${barPct}%`, backgroundColor: z.color }]} />
            </View>
            <View style={styles.valueCol}>
              <Text style={[styles.time, { color: theme.text }]}>
                {seconds[i] > 0 ? formatDuration(seconds[i]) : '--'}
              </Text>
              <Text style={[styles.pct, { color: theme.textSecondary }]}>
                {Math.round(pct * 100)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  labelCol: { width: 86 },
  zone: { fontSize: 13, fontWeight: '700' },
  zoneSub: { fontSize: 10, marginTop: 1 },
  barZone: { flex: 1, marginHorizontal: 8 },
  bar: { height: 16, borderRadius: 5 },
  valueCol: { width: 58, alignItems: 'flex-end' },
  time: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
  pct: { fontSize: 10.5, fontVariant: ['tabular-nums'] },
});
