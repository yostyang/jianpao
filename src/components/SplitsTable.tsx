import { StyleSheet, Text, View } from 'react-native';

import { Accent } from '@/constants/theme';
import { formatPace } from '@/fit/parser';
import { useTheme } from '@/hooks/use-theme';
import type { Split } from '@/types/activity';

/** 每公里配速表:横条长度 ∝ 速度(最快一段最长且高亮) */
export function SplitsTable({ splits }: { splits: Split[] }) {
  const theme = useTheme();
  if (splits.length === 0) return null;

  // 只用完整公里段决定比例,尾段太短时配速噪声大
  const paces = splits.map((s) => s.pace);
  const minPace = Math.min(...paces);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>每公里配速</Text>
      <View style={styles.headerRow}>
        <Text style={[styles.headKm, { color: theme.textSecondary }]}>公里</Text>
        <Text style={[styles.headBar, { color: theme.textSecondary }]} />
        <Text style={[styles.headPace, { color: theme.textSecondary }]}>配速</Text>
        <Text style={[styles.headHr, { color: theme.textSecondary }]}>心率</Text>
      </View>
      {splits.map((s) => {
        const isPartial = s.distance < 950;
        const widthPct = Math.max(18, Math.min(100, (minPace / s.pace) * 100));
        const fastest = s.pace === minPace && !isPartial;
        return (
          <View key={s.index} style={styles.row}>
            <Text style={[styles.km, { color: theme.textSecondary }]}>
              {isPartial ? (s.distance / 1000).toFixed(2) : s.index}
            </Text>
            <View style={styles.barZone}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${widthPct}%`,
                    backgroundColor: Accent,
                    opacity: fastest ? 1 : 0.4,
                  },
                ]}
              />
            </View>
            <Text style={[styles.pace, { color: theme.text }]}>{formatPace(s.pace)}</Text>
            <View style={styles.hrCol}>
              <Text style={[styles.hr, { color: theme.textSecondary }]}>{s.avgHr ?? '--'}</Text>
              <Text style={[styles.elev, { color: theme.textSecondary }]}>
                {s.elevGain != null && s.elevGain > 0 ? `+${s.elevGain}m` : ''}
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
  title: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headKm: { width: 36, fontSize: 11 },
  headBar: { flex: 1, fontSize: 11, marginLeft: 8 },
  headPace: { width: 52, fontSize: 11, textAlign: 'right' },
  headHr: { width: 44, fontSize: 11, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  km: { width: 36, fontSize: 13, fontVariant: ['tabular-nums'] },
  barZone: { flex: 1, marginLeft: 8 },
  bar: { height: 18, borderRadius: 5 },
  pace: { width: 52, fontSize: 13, textAlign: 'right', fontVariant: ['tabular-nums'] },
  hrCol: { width: 44, alignItems: 'flex-end' },
  hr: { fontSize: 13, fontVariant: ['tabular-nums'] },
  elev: { fontSize: 10, fontVariant: ['tabular-nums'] },
});
