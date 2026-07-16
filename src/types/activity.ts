/** 运动类型(内部统一枚举,FIT/Strava 等来源都映射到这里) */
export type SportType = 'run' | 'walk' | 'ride' | 'strength' | 'other';

/** 数据来源 */
export type ActivitySource = 'fit' | 'strava' | 'garmin' | 'coros' | 'huawei';

/** 每公里(或最后不足一公里)的分段 */
export interface Split {
  /** 第几公里,从 1 开始 */
  index: number;
  /** 本段距离,米(最后一段可能 < 1000) */
  distance: number;
  /** 本段耗时,秒 */
  duration: number;
  /** 本段配速,秒/公里(按距离折算) */
  pace: number;
  /** 本段平均心率 */
  avgHr?: number;
  /** 本段累计爬升,米 */
  elevGain?: number;
}

/** 活动摘要(存 SQLite,列表/统计用) */
export interface ActivitySummary {
  id: string;
  source: ActivitySource;
  /** 来源平台的活动 ID(同步去重用) */
  externalId?: string;
  sport: SportType;
  /** FIT 原始 sport 字符串,如 trail_running */
  sportRaw?: string;
  /** 展示名,如「夜跑」 */
  name: string;
  /** 开始时间,epoch 毫秒 */
  startTime: number;
  /** 计时时长(去暂停),秒 */
  duration: number;
  /** 总流逝时长,秒 */
  elapsed: number;
  /** 总距离,米 */
  distance: number;
  /** 平均配速,秒/公里 */
  avgPace?: number;
  avgHr?: number;
  maxHr?: number;
  minHr?: number;
  /** 平均步频,步/分钟(双脚) */
  avgCadence?: number;
  /** 平均步幅,米/步 */
  strideLen?: number;
  /** 估算运动强度(METs,ACSM 平地跑公式) */
  mets?: number;
  /** 累计爬升,米 */
  elevGain?: number;
  /** 累计下降,米 */
  descent?: number;
  calories?: number;
  splits: Split[];
  /** 是否有 GPS 轨迹 */
  hasTrack: boolean;
  /** 地区,如「上海市 · 松江区」(由起点坐标逆地理编码,查询前模糊到 ~1km) */
  region?: string;
  /** FIT 文件内容哈希,导入去重用 */
  fitHash?: string;
}

/** 时序采样点(存 JSON 文件,详情页按需加载) */
export interface Sample {
  /** 距开始的秒数 */
  t: number;
  lat?: number;
  lng?: number;
  /** 海拔,米 */
  alt?: number;
  /** 心率 */
  hr?: number;
  /** 步频,步/分钟(双脚) */
  cad?: number;
  /** 速度,米/秒 */
  speed?: number;
  /** 累计距离,米 */
  dist?: number;
}

/** 解析结果(还没有 id/source,入库时补) */
export interface ParsedActivity {
  summary: Omit<ActivitySummary, 'id' | 'source'>;
  samples: Sample[];
}

/** 已绑定的同步账号 */
export interface SyncAccount {
  provider: string;
  athleteName: string;
  accessToken: string;
  refreshToken?: string;
  /** epoch 毫秒 */
  expiresAt?: number;
  /** epoch 毫秒 */
  lastSyncAt?: number;
}
