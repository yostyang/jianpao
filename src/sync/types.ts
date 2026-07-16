import type { ParsedActivity, SyncAccount } from '../types/activity';

/** 远端平台的活动摘要(拉取列表用) */
export interface RemoteActivity {
  id: string;
  name?: string;
  sport: string;
  /** epoch 毫秒 */
  startTime: number;
  /** 米 */
  distance: number;
  /** 秒 */
  duration: number;
}

export type ProviderStatus =
  /** 已实现,可直接绑定 */
  | 'ready'
  /** 已实现但需要用户先申请平台 API 凭据 */
  | 'needs_setup'
  /** 占位,等平台开放资质后接入 */
  | 'coming_soon';

/**
 * 同步平台适配器统一契约。
 * 新增平台 = 在 providers/ 下加一个实现文件并注册,页面无需改动。
 */
export interface SyncProvider {
  id: string;
  name: string;
  status: ProviderStatus;
  /** 绑定页展示的现状/说明 */
  note: string;
  authorize?(): Promise<SyncAccount>;
  listActivities?(account: SyncAccount, sinceMs: number): Promise<RemoteActivity[]>;
  /** 拉取单个活动详情并转成内部统一模型 */
  fetchDetail?(account: SyncAccount, remoteId: string): Promise<ParsedActivity>;
}
