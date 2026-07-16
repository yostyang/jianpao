import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Pressable, Text, View } from 'react-native';

import { Accent } from '@/constants/theme';
import { formatDuration, formatPace } from '@/fit/parser';
import { useTheme } from '@/hooks/use-theme';
import type { ActivitySummary, SportType } from '@/types/activity';

const SPORT_ICON: Record<SportType, keyof typeof Ionicons.glyphMap> = {
  run: 'walk',
  walk: 'footsteps',
  ride: 'bicycle',
  strength: 'barbell',
  other: 'pulse',
};

function dateLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export function ActivityCard({
  activity,
  onPress,
}: {
  activity: ActivitySummary;
  onPress: () => void;
}) {
  const theme = useTheme();
  const metrics: string[] = [dateLabel(activity.startTime), formatDuration(activity.duration)];
  if (activity.sport === 'ride' && activity.distance >= 100 && activity.duration > 0) {
    metrics.push(`${((activity.distance / activity.duration) * 3.6).toFixed(1)} km/h`);
  } else if (activity.avgPace) {
    metrics.push(formatPace(activity.avgPace));
  }
  if (activity.avgHr) metrics.push(`${activity.avgHr} bpm`);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${Accent}1A` }]}>
        <Ionicons name={SPORT_ICON[activity.sport]} size={18} color={Accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]}>{activity.name}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{metrics.join(' · ')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  meta: { fontSize: 12.5, fontVariant: ['tabular-nums'] },
});
