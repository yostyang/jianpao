import * as Crypto from 'expo-crypto';

import { parseFit } from '../fit/parser';
import { regionOfSamples } from '../lib/geocode';
import { activityRepo } from './activityRepo';

export interface ImportOutcome {
  fileName: string;
  status: 'ok' | 'duplicate' | 'error';
  message?: string;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 导入一个 FIT 文件:哈希去重 → 解析 → 入库 */
export async function importFitFile(data: ArrayBuffer, fileName: string): Promise<ImportOutcome> {
  try {
    const fitHash = toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, data));
    const parsed = parseFit(data);
    // 地区:起点坐标(模糊到 ~1km)逆地理编码,离线/失败时留空,详情页会自动补
    parsed.summary.region = await regionOfSamples(parsed.samples);
    const result = await activityRepo.insert(parsed, { source: 'fit', fitHash });
    if (result.status === 'duplicate') {
      return { fileName, status: 'duplicate', message: '已存在相同活动,跳过' };
    }
    return { fileName, status: 'ok' };
  } catch (e) {
    return { fileName, status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
