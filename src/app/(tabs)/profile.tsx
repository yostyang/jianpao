import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Accent } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { runImportFlow } from '@/lib/importFlow';
import { showMessage } from '@/lib/notify';
import { providers } from '@/sync/registry';
import type { ProviderStatus } from '@/sync/types';

const STATUS_LABEL: Record<ProviderStatus, string> = {
  ready: '已就绪',
  needs_setup: '下一版',
  coming_soon: '规划中',
};

function StatusChip({ status }: { status: ProviderStatus }) {
  const theme = useTheme();
  const highlighted = status !== 'coming_soon';
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: highlighted ? `${Accent}1A` : theme.backgroundSelected },
      ]}>
      <Text style={[styles.chipText, { color: highlighted ? Accent : theme.textSecondary }]}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const [importing, setImporting] = useState(false);

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>我的</Text>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>账号绑定同步</Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {providers.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => showMessage(p.name, p.note)}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
              ]}>
              <Text style={[styles.rowText, { color: theme.text }]} numberOfLines={1}>
                {p.name}
              </Text>
              <StatusChip status={p.status} />
              <Ionicons name="chevron-forward" size={15} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          绑定后可自动同步手表数据。在平台接入前,所有手表都可以先用「导出 FIT → 导入」的方式使用。
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>数据</Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <Pressable style={styles.row} onPress={onImport}>
            {importing ? (
              <ActivityIndicator size="small" color={Accent} />
            ) : (
              <Ionicons name="document-attach-outline" size={18} color={Accent} />
            )}
            <Text style={[styles.rowText, { color: theme.text, marginLeft: 10 }]}>导入 FIT 文件</Text>
            <Ionicons name="chevron-forward" size={15} color={theme.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>关于</Text>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: theme.text }]}>简跑 v0.1.0</Text>
          </View>
        </View>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          本地优先:所有运动数据仅保存在你的设备上。支持导入佳明、高驰、华米、华为等手表导出的 FIT 文件。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginTop: 22, marginBottom: 8 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  rowText: { flex: 1, fontSize: 15 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8 },
});
