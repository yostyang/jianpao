import type { SyncProvider } from './types';

/**
 * 各平台接入现状(2026-07):
 * - Strava:个人开发者可免费申请 OAuth API,是第一个真正接入的平台;
 *   Garmin/COROS/华为等手表都支持自动同步到 Strava,可作为中转覆盖大部分设备。
 * - Garmin / COROS / 华为:官方 API 需开发者资质申请,拿到后点亮对应 provider。
 * - 华米 Zepp / Keep / 小米 / OPPO / vivo:无正式开放 API,
 *   建议在对应 App 内导出 FIT 文件后导入,或绑定 Strava 中转。
 */
export const providers: SyncProvider[] = [
  {
    id: 'strava',
    name: 'Strava',
    status: 'needs_setup',
    note:
      '下一版本接入。需要先在 strava.com 免费申请一个 API Client(当天可拿到),' +
      '之后即可绑定账号自动同步。Garmin、COROS、华为等手表都能自动同步到 Strava,绑定它等于覆盖大部分手表。',
  },
  {
    id: 'garmin',
    name: 'Garmin 佳明',
    status: 'coming_soon',
    note: '官方 Connect API 需开发者资质,申请通过后接入。目前可用 Garmin Connect 导出 FIT 文件导入,或经 Strava 中转。',
  },
  {
    id: 'coros',
    name: 'COROS 高驰',
    status: 'coming_soon',
    note: '开放 API 需商务申请。目前可在高驰 App 导出 FIT 文件导入,或经 Strava 中转。',
  },
  {
    id: 'huawei',
    name: '华为运动健康',
    status: 'coming_soon',
    note: 'Health Kit 需开发者认证,申请通过后接入。目前可在运动健康 App 导出数据,或经 Strava 中转。',
  },
  {
    id: 'zepp',
    name: '华米 Zepp / Keep / 小米 / OPPO / vivo',
    status: 'coming_soon',
    note: '这些平台暂无正式开放 API。推荐在对应 App 内导出 FIT 文件后从「导入」进入;部分品牌支持绑定 Strava 后中转同步。',
  },
];
