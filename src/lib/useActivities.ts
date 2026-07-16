import { useEffect, useState } from 'react';

import { activityRepo } from '../store/activityRepo';
import type { ActivitySummary } from '../types/activity';

let cache: ActivitySummary[] | null = null;
const listeners = new Set<() => void>();

/** 导入/删除后调用,让所有页面刷新 */
export function notifyActivitiesChanged() {
  cache = null;
  for (const l of listeners) l();
}

/** 活动列表(按时间倒序);null 表示加载中 */
export function useActivities(): ActivitySummary[] | null {
  const [items, setItems] = useState<ActivitySummary[] | null>(cache);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      await activityRepo.init();
      const list = await activityRepo.list();
      cache = list;
      if (alive) setItems(list);
    };
    if (!cache) load();
    const cb = () => load();
    listeners.add(cb);
    return () => {
      alive = false;
      listeners.delete(cb);
    };
  }, []);

  return items;
}
