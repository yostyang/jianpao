import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { importFitFile } from '../store/importer';
import { showMessage } from './notify';
import { notifyActivitiesChanged } from './useActivities';

/** public/testdata 下的本地演示 FIT(不入库、不进构建产物,仅开发环境可用) */
const FILES = [
  'Cycling_20260614_173228.fit',
  'Running_20260613_182335.fit',
  'Running_20260620_111819.fit',
  'Running_20260625_190918.fit',
  'Running_20260627_105046.fit',
  'Running_20260629_185549.fit',
  'Running_20260630_201110.fit',
  'Running_20260702_204821.fit',
  'StrengthTraining_20260701_192435.fit',
];

/** Metro 开发服务器地址(模拟器/真机上不能用相对路径) */
function devServerOrigin(): string {
  if (Platform.OS === 'web') return '';
  const host = Constants.expoConfig?.hostUri;
  return host ? `http://${host}` : 'http://localhost:8081';
}

/** 开发用:从 Metro 拉取演示 FIT 并导入 */
export async function loadDemoData(): Promise<void> {
  const origin = devServerOrigin();
  let ok = 0;
  let dup = 0;
  let fail = 0;
  for (const f of FILES) {
    try {
      const res = await fetch(`${origin}/testdata/${f}`);
      if (!res.ok) {
        fail++;
        continue;
      }
      const r = await importFitFile(await res.arrayBuffer(), f);
      if (r.status === 'ok') ok++;
      else if (r.status === 'duplicate') dup++;
      else fail++;
    } catch {
      fail++;
    }
  }
  if (ok > 0) notifyActivitiesChanged();
  showMessage(
    `演示数据:导入 ${ok} 条` +
      (dup ? `,跳过重复 ${dup} 条` : '') +
      (fail ? `,失败 ${fail} 条` : '')
  );
}
