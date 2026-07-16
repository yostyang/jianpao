import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

import { notifyActivitiesChanged } from '@/lib/useActivities';
import { importFitFile } from '@/store/importer';

if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') {
  // 开发用:在浏览器控制台注入测试数据 __importFit(arrayBuffer, name)
  (window as any).__importFit = async (data: ArrayBuffer, name: string) => {
    const r = await importFitFile(data, name);
    notifyActivitiesChanged();
    return r;
  };
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activity/[id]" options={{ title: '活动详情', headerBackTitle: '返回' }} />
      </Stack>
    </ThemeProvider>
  );
}
