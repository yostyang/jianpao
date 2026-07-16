import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/ActivityCard';
import { Accent } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { runImportFlow } from '@/lib/importFlow';
import { useActivities } from '@/lib/useActivities';
import type { ActivitySummary } from '@/types/activity';

interface MonthSection {
  title: string;
  totalKm: number;
  data: ActivitySummary[];
}

function groupByMonth(items: ActivitySummary[]): MonthSection[] {
  const sections: MonthSection[] = [];
  let current: MonthSection | null = null;
  for (const a of items) {
    const d = new Date(a.startTime);
    const title = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!current || current.title !== title) {
      current = { title, totalKm: 0, data: [] };
      sections.push(current);
    }
    current.data.push(a);
    current.totalKm += a.distance / 1000;
  }
  return sections;
}

export default function ActivitiesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const activities = useActivities();
  const [importing, setImporting] = useState(false);
  const sections = useMemo(() => groupByMonth(activities ?? []), [activities]);

  const onImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      await runImportFlow();
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>简跑</Text>
        <Pressable onPress={onImport} style={styles.importBtn} disabled={importing}>
          {importing ? (
            <ActivityIndicator size="small" color={Accent} />
          ) : (
            <Ionicons name="add" size={20} color={Accent} />
          )}
          <Text style={[styles.importText, { color: Accent }]}>导入 FIT</Text>
        </Pressable>
      </View>

      {activities === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={Accent} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>还没有活动</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            点右上角「导入 FIT」,把手表导出的运动记录带进来
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionTotal, { color: theme.textSecondary }]}>
                {section.totalKm.toFixed(1)} km
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => router.push({ pathname: '/activity/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800' },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6 },
  importText: { fontSize: 15, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 14 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600' },
  sectionTotal: { fontSize: 12, fontVariant: ['tabular-nums'] },
});
