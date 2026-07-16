import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart } from '@/components/BarChart';
import { Heatmap } from '@/components/Heatmap';
import { RecordsCard } from '@/components/RecordsCard';
import { Accent } from '@/constants/theme';
import { formatDuration } from '@/fit/parser';
import { useTheme } from '@/hooks/use-theme';
import { useActivities } from '@/lib/useActivities';
import {
  inRange,
  monthStart,
  monthlySeries,
  sumStats,
  weekStart,
  weeklySeries,
  yearMonthly,
  type PeriodStats,
} from '@/store/stats';

type Mode = 'week' | 'month' | 'year';
const MODES: { key: Mode; label: string }[] = [
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
];

function StatBlock({ label, stats }: { label: string; stats: PeriodStats }) {
  const theme = useTheme();
  const hours = stats.duration / 3600;
  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.blockLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.blockValue, { color: theme.text }]}>
        {(stats.distance / 1000).toFixed(1)}
        <Text style={styles.blockUnit}> km</Text>
      </Text>
      <Text style={[styles.blockSub, { color: theme.textSecondary }]}>
        {stats.count} 次 · {hours >= 1 ? `${hours.toFixed(1)} 小时` : `${Math.round(stats.duration / 60)} 分钟`}
      </Text>
    </View>
  );
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.blockValue, { color: theme.text }]}>{value}</Text>
      {sub ? <Text style={[styles.blockSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
      <Text style={[styles.blockLabel, { color: theme.textSecondary, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

function Hero({ km, caption }: { km: number; caption: string }) {
  const theme = useTheme();
  return (
    <View style={styles.hero}>
      <View style={styles.heroRow}>
        <Text style={[styles.heroValue, { color: theme.text }]}>
          {km >= 100 ? km.toFixed(1) : km.toFixed(2)}
        </Text>
        <Text style={[styles.heroUnit, { color: theme.textSecondary }]}>公里</Text>
      </View>
      <Text style={[styles.heroCaption, { color: theme.textSecondary }]}>{caption}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const activities = useActivities();
  const [mode, setMode] = useState<Mode>('week');
  const now = new Date();
  const year = now.getFullYear();

  const runs = useMemo(() => (activities ?? []).filter((a) => a.sport === 'run'), [activities]);

  const week = useMemo(() => sumStats(inRange(runs, weekStart().getTime())), [runs]);
  const month = useMemo(() => sumStats(inRange(runs, monthStart().getTime())), [runs]);
  const total = useMemo(() => sumStats(runs), [runs]);

  const weekBars = useMemo(
    () => weeklySeries(runs, 12).map((w) => ({ label: w.label, value: w.distance / 1000 })),
    [runs]
  );
  const monthBars = useMemo(
    () => monthlySeries(runs, 12).map((m) => ({ label: m.label, value: m.distance / 1000 })),
    [runs]
  );
  const yearBars = useMemo(
    () => yearMonthly(runs, year).map((m) => ({ label: m.label, value: m.distance / 1000 })),
    [runs, year]
  );

  const yearStats = useMemo(
    () => sumStats(inRange(runs, new Date(year, 0, 1).getTime(), new Date(year + 1, 0, 1).getTime())),
    [runs, year]
  );
  const lastYearStats = useMemo(
    () =>
      sumStats(inRange(runs, new Date(year - 1, 0, 1).getTime(), new Date(year, 0, 1).getTime())),
    [runs, year]
  );

  // 年视图的月度洞察(只看有跑量的月份;月均按已过去的月份算)
  const activeMonths = yearBars.filter((b) => b.value > 0);
  const monthsElapsed = now.getMonth() + 1;
  const best = activeMonths.length
    ? activeMonths.reduce((a, b) => (b.value > a.value ? b : a))
    : null;
  const worst =
    activeMonths.length > 1 ? activeMonths.reduce((a, b) => (b.value < a.value ? b : a)) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>统计</Text>
        <Text style={[styles.caption, { color: theme.textSecondary }]}>仅统计跑步类活动</Text>

        <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.segment, active && { backgroundColor: theme.background }]}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? Accent : theme.textSecondary },
                  ]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'week' ? (
          <>
            <View style={styles.blocks}>
              <StatBlock label="本周" stats={week} />
              <StatBlock label="本月" stats={month} />
              <StatBlock label="累计" stats={total} />
            </View>
            <BarChart title="每周跑量(近 12 周)" bars={weekBars} format={(v) => v.toFixed(1)} />
            <Heatmap items={runs} />
          </>
        ) : null}

        {mode === 'month' ? (
          <>
            <Hero
              km={month.distance / 1000}
              caption={`${now.getMonth() + 1}月 · ${month.count} 次 · ${formatDuration(month.duration)}`}
            />
            <BarChart title="每月跑量(近 12 个月)" bars={monthBars} format={(v) => v.toFixed(0)} />
          </>
        ) : null}

        {mode === 'year' ? (
          <>
            <Hero
              km={yearStats.distance / 1000}
              caption={`${year}年 · ${yearStats.count} 次 · ${(yearStats.duration / 3600).toFixed(1)} 小时`}
            />
            <BarChart title={`${year}年每月跑量`} bars={yearBars} format={(v) => v.toFixed(0)} />
            <View style={[styles.blocks, { marginTop: 16 }]}>
              <InfoCard
                label="每月平均"
                value={(yearStats.distance / 1000 / Math.max(monthsElapsed, 1)).toFixed(1)}
                sub="km"
              />
              {best ? (
                <InfoCard label="最佳月份" value={best.value.toFixed(1)} sub={`km · ${best.label}`} />
              ) : null}
              {worst && worst.label !== best?.label ? (
                <InfoCard label="最少月份" value={worst.value.toFixed(1)} sub={`km · ${worst.label}`} />
              ) : null}
            </View>
            {lastYearStats.distance > 0 ? (
              <Text style={[styles.compare, { color: theme.textSecondary }]}>
                比 {year - 1} 年{yearStats.distance >= lastYearStats.distance ? '多' : '少'}跑了{' '}
                {(Math.abs(yearStats.distance - lastYearStats.distance) / 1000).toFixed(1)} 公里
              </Text>
            ) : null}
          </>
        ) : null}

        <RecordsCard items={runs} />

        {total.count > 0 ? (
          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            累计爬升 {Math.round(total.elevGain)} m · 累计时长 {(total.duration / 3600).toFixed(1)} 小时
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 12 },
  caption: { fontSize: 12, marginTop: 4 },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginTop: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  hero: { marginTop: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroValue: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroUnit: { fontSize: 14, fontWeight: '600' },
  heroCaption: { fontSize: 12.5, marginTop: 4, fontVariant: ['tabular-nums'] },
  blocks: { flexDirection: 'row', gap: 10, marginTop: 18 },
  block: { flex: 1, borderRadius: 16, padding: 14 },
  blockLabel: { fontSize: 12, fontWeight: '600' },
  blockValue: { fontSize: 22, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
  blockUnit: { fontSize: 12, fontWeight: '600' },
  blockSub: { fontSize: 11, marginTop: 4, fontVariant: ['tabular-nums'] },
  compare: { fontSize: 12.5, marginTop: 14, textAlign: 'center' },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 28, fontVariant: ['tabular-nums'] },
});
