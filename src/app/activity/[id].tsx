import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HrZones } from '@/components/HrZones';
import { LineChart } from '@/components/LineChart';
import { SplitsTable } from '@/components/SplitsTable';
import { TrackMap } from '@/components/TrackMap';
import { Accent, ChartColors } from '@/constants/theme';
import { formatDuration, formatPace } from '@/fit/parser';
import { useTheme } from '@/hooks/use-theme';
import { regionOfSamples } from '@/lib/geocode';
import { confirmAction } from '@/lib/notify';
import { foodEquivalent } from '@/lib/foodEquiv';
import { cadSeries, elevSeries, hrSeries, paceSeries, speedSeries, xUnitOf } from '@/lib/series';
import { useActivities, notifyActivitiesChanged } from '@/lib/useActivities';
import { activityRepo } from '@/store/activityRepo';
import type { ActivitySummary, Sample } from '@/types/activity';

const SOURCE_LABEL: Record<string, string> = {
  fit: 'FIT 导入',
  strava: 'Strava 同步',
};

function fullDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  // 订阅列表变化,同时用全部活动的最高心率估算心率区间
  const all = useActivities();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [samples, setSamples] = useState<Sample[] | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      await activityRepo.init();
      const s = await activityRepo.get(id);
      const sm = await activityRepo.getSamples(id);
      if (alive) {
        setSummary(s);
        setSamples(sm);
      }
      // 老数据没有地区信息,打开详情时静默回填一次
      if (s && !s.region && s.hasTrack && sm.length) {
        const region = await regionOfSamples(sm);
        if (region) {
          const updated = { ...s, region };
          await activityRepo.update(updated);
          notifyActivitiesChanged();
          if (alive) setSummary(updated);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const xUnit = useMemo(() => xUnitOf(samples ?? []), [samples]);
  const isRideSport = summary?.sport === 'ride';
  const pace = useMemo(
    () => (isRideSport ? speedSeries(samples ?? [], xUnit) : paceSeries(samples ?? [], xUnit)),
    [samples, xUnit, isRideSport]
  );
  const hr = useMemo(() => hrSeries(samples ?? [], xUnit), [samples, xUnit]);
  const cad = useMemo(() => cadSeries(samples ?? [], xUnit), [samples, xUnit]);
  const elev = useMemo(() => elevSeries(samples ?? [], xUnit), [samples, xUnit]);
  // 历史观测最高心率会随导入数据增多趋近真实值,数据少时用 185 兜底避免区间划分严重偏高
  const hrMax = useMemo(
    () => Math.max(...(all ?? []).map((a) => a.maxHr ?? 0), summary?.maxHr ?? 0, 185),
    [all, summary]
  );

  const onDelete = () => {
    if (!summary) return;
    confirmAction('删除活动', `确定删除「${summary.name}」吗?此操作不可恢复。`, async () => {
      await activityRepo.remove(summary.id);
      notifyActivitiesChanged();
      router.back();
    });
  };

  if (!summary || samples === null) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={Accent} />
      </View>
    );
  }

  // 无距离的活动(如力量训练)以时长为主角
  const hasDistance = summary.distance >= 100;
  const metrics: { label: string; value: string }[] = hasDistance
    ? [{ label: '时长', value: formatDuration(summary.duration) }]
    : [];
  const isRide = summary.sport === 'ride';
  if (isRide && hasDistance && summary.duration > 0) {
    metrics.push({
      label: '平均速度',
      value: `${((summary.distance / summary.duration) * 3.6).toFixed(1)} km/h`,
    });
  } else if (summary.avgPace) {
    metrics.push({ label: '平均配速', value: formatPace(summary.avgPace) });
  }
  if (summary.avgHr) {
    metrics.push({
      label: `平均心率${summary.maxHr ? ` / 最高 ${summary.maxHr}` : ''}`,
      value: `${summary.avgHr}`,
    });
  }
  if (summary.minHr) metrics.push({ label: '最低心率', value: `${summary.minHr}` });
  if (summary.avgCadence) metrics.push({ label: '平均步频', value: `${summary.avgCadence}` });
  if (summary.strideLen) metrics.push({ label: '步幅 (米)', value: summary.strideLen.toFixed(2) });
  if (summary.elevGain != null && summary.elevGain > 0)
    metrics.push({
      label: summary.descent != null ? `爬升 / 下降 ${summary.descent} (m)` : '爬升 (m)',
      value: `${summary.elevGain}`,
    });
  if (summary.mets)
    metrics.push({
      label: `运动强度${summary.mets >= 6 ? ' · 高' : summary.mets >= 3 ? ' · 中' : ''}`,
      value: `${summary.mets} METs`,
    });
  if (summary.calories) metrics.push({ label: '卡路里', value: `${summary.calories}` });
  const food = summary.calories ? foodEquivalent(summary.calories) : '';
  if (food) metrics.push({ label: '相当于', value: food });

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: summary.name }} />
      <Text style={[styles.date, { color: theme.textSecondary }]}>
        {fullDate(summary.startTime)}
        {summary.region ? ` · ${summary.region}` : ''} ·{' '}
        {SOURCE_LABEL[summary.source] ?? summary.source}
      </Text>

      <View style={styles.distanceWrap}>
        <Text style={[styles.distance, { color: theme.text }]}>
          {hasDistance ? (summary.distance / 1000).toFixed(2) : formatDuration(summary.duration)}
        </Text>
        <Text style={[styles.distanceUnit, { color: theme.textSecondary }]}>
          {hasDistance ? '公里' : '时长'}
        </Text>
      </View>

      <View style={styles.metrics}>
        {metrics.map((m) => (
          <Metric key={m.label} label={m.label} value={m.value} />
        ))}
      </View>

      {summary.hasTrack ? (
        <View style={[styles.trackCard, { backgroundColor: theme.backgroundElement }]}>
          <TrackMap samples={samples} />
        </View>
      ) : null}

      {isRide ? (
        <LineChart
          title="速度"
          points={pace}
          color={ChartColors.pace}
          xUnit={xUnit}
          formatY={(v) => `${v.toFixed(1)}`}
          avg={hasDistance && summary.duration > 0 ? (summary.distance / summary.duration) * 3.6 : undefined}
          rangeText={(min, max) => `${min.toFixed(1)} ~ ${max.toFixed(1)} km/h`}
        />
      ) : (
        <LineChart
          title="配速"
          points={pace}
          color={ChartColors.pace}
          inverted
          xUnit={xUnit}
          formatY={formatPace}
          avg={summary.avgPace}
          rangeText={(min, max) => `${formatPace(min)} ~ ${formatPace(max)}`}
        />
      )}
      <LineChart
        title="心率"
        points={hr}
        color={ChartColors.hr}
        xUnit={xUnit}
        formatY={(v) => `${Math.round(v)}`}
        avg={summary.avgHr}
        rangeText={(min, max) => `${Math.round(min)} ~ ${Math.round(max)} bpm`}
      />
      {hrMax >= 100 ? <HrZones samples={samples} hrMax={hrMax} /> : null}
      <LineChart
        title="步频"
        points={cad}
        color={ChartColors.cad}
        xUnit={xUnit}
        formatY={(v) => `${Math.round(v)}`}
        avg={summary.avgCadence}
        rangeText={(min, max) => `${Math.round(min)} ~ ${Math.round(max)} 步/分`}
      />
      <LineChart
        title="海拔"
        points={elev}
        color={ChartColors.elev}
        xUnit={xUnit}
        formatY={(v) => `${Math.round(v)}m`}
        rangeText={(min, max) => `${Math.round(min)} ~ ${Math.round(max)} m`}
      />

      <SplitsTable splits={summary.splits} />

      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>删除该活动</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 48 },
  date: { fontSize: 13 },
  distanceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 },
  distance: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  distanceUnit: { fontSize: 14, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 },
  metric: { width: '33.33%' },
  metricValue: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 11, marginTop: 2 },
  trackCard: { borderRadius: 16, padding: 12, marginTop: 20 },
  deleteBtn: { alignSelf: 'center', marginTop: 36, padding: 10 },
  deleteText: { color: '#E14D64', fontSize: 14, fontWeight: '600' },
});
