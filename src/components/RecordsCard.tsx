import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Accent } from '@/constants/theme';
import { formatDuration, formatPace } from '@/fit/parser';
import { useTheme } from '@/hooks/use-theme';
import { computeRecords } from '@/store/records';
import type { ActivitySummary } from '@/types/activity';

function dateLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

interface Row {
  label: string;
  value: string;
  sub: string;
  activityId: string;
}

/** 个人纪录卡片:最快 1/5/10 公里、最长距离、最长时长 */
export function RecordsCard({ items }: { items: ActivitySummary[] }) {
  const theme = useTheme();
  const router = useRouter();
  const r = computeRecords(items);

  const rows: Row[] = [];
  if (r.fastest1k)
    rows.push({
      label: '最快 1 公里',
      value: formatPace(r.fastest1k.pace),
      sub: dateLabel(r.fastest1k.date),
      activityId: r.fastest1k.activityId,
    });
  if (r.fastest5k)
    rows.push({
      label: '最快 5 公里',
      value: formatDuration(r.fastest5k.duration),
      sub: `${formatPace(r.fastest5k.pace)} · ${dateLabel(r.fastest5k.date)}`,
      activityId: r.fastest5k.activityId,
    });
  if (r.fastest10k)
    rows.push({
      label: '最快 10 公里',
      value: formatDuration(r.fastest10k.duration),
      sub: `${formatPace(r.fastest10k.pace)} · ${dateLabel(r.fastest10k.date)}`,
      activityId: r.fastest10k.activityId,
    });
  if (r.longestDistance)
    rows.push({
      label: '最长距离',
      value: `${(r.longestDistance.value / 1000).toFixed(2)} km`,
      sub: dateLabel(r.longestDistance.date),
      activityId: r.longestDistance.activityId,
    });
  if (r.longestDuration)
    rows.push({
      label: '最长时长',
      value: formatDuration(r.longestDuration.value),
      sub: dateLabel(r.longestDuration.date),
      activityId: r.longestDuration.activityId,
    });
  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>个人纪录</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {rows.map((row, i) => (
          <Pressable
            key={row.label}
            onPress={() =>
              router.push({ pathname: '/activity/[id]', params: { id: row.activityId } })
            }
            style={[
              styles.row,
              i > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.backgroundSelected,
              },
            ]}>
            <Ionicons name="trophy-outline" size={15} color={Accent} />
            <Text style={[styles.label, { color: theme.text }]}>{row.label}</Text>
            <View style={styles.valueCol}>
              <Text style={[styles.value, { color: theme.text }]}>{row.value}</Text>
              <Text style={[styles.sub, { color: theme.textSecondary }]}>{row.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  label: { flex: 1, fontSize: 14 },
  valueCol: { alignItems: 'flex-end' },
  value: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, marginTop: 1, fontVariant: ['tabular-nums'] },
});
