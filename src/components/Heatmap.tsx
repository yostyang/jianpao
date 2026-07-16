import { StyleSheet, Text, View } from 'react-native';

import { Accent } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dayTotals, weekStart } from '@/store/stats';
import type { ActivitySummary } from '@/types/activity';

const WEEKS = 16;
const DAY = 24 * 3600 * 1000;

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function cellColor(meters: number, empty: string): { color: string; opacity: number } {
  if (meters <= 0) return { color: empty, opacity: 1 };
  const km = meters / 1000;
  if (km < 3) return { color: Accent, opacity: 0.3 };
  if (km < 6) return { color: Accent, opacity: 0.55 };
  if (km < 10) return { color: Accent, opacity: 0.8 };
  return { color: Accent, opacity: 1 };
}

/** 最近 16 周的跑量日历热力图(列=周,行=周一到周日) */
export function Heatmap({ items }: { items: ActivitySummary[] }) {
  const theme = useTheme();
  const totals = dayTotals(items);
  const firstMonday = weekStart().getTime() - (WEEKS - 1) * 7 * DAY;
  const today = Date.now();

  const columns = [];
  for (let w = 0; w < WEEKS; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const ts = firstMonday + w * 7 * DAY + d * DAY;
      days.push({ ts, meters: ts <= today ? (totals.get(keyOf(new Date(ts))) ?? 0) : -1 });
    }
    columns.push(days);
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>最近 {WEEKS} 周</Text>
      <View style={styles.grid}>
        {columns.map((days, w) => (
          <View key={w} style={styles.col}>
            {days.map((d, i) => {
              if (d.meters < 0) return <View key={i} style={styles.cell} />;
              const { color, opacity } = cellColor(d.meters, theme.backgroundSelected);
              return (
                <View key={i} style={[styles.cell, { backgroundColor: color, opacity }]} />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.textSecondary }]}>少</Text>
        {[0.3, 0.55, 0.8, 1].map((o) => (
          <View key={o} style={[styles.legendCell, { backgroundColor: Accent, opacity: o }]} />
        ))}
        <Text style={[styles.legendText, { color: theme.textSecondary, marginLeft: 6 }]}>多</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 4 },
  col: { gap: 4, flex: 1 },
  cell: { aspectRatio: 1, borderRadius: 4, width: '100%' },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'flex-end' },
  legendCell: { width: 12, height: 12, borderRadius: 4, marginLeft: 4 },
  legendText: { fontSize: 11 },
});
