import { importFitFile } from '../store/importer';
import { showMessage } from './notify';
import { pickFits } from './pickFits';
import { notifyActivitiesChanged } from './useActivities';

/** 完整导入流程:选文件 → 逐个解析入库 → 刷新列表 → 汇报结果 */
export async function runImportFlow() {
  const files = await pickFits();
  if (files.length === 0) return;

  let ok = 0;
  let dup = 0;
  const errors: string[] = [];
  for (const f of files) {
    const r = await importFitFile(f.data, f.name);
    if (r.status === 'ok') ok++;
    else if (r.status === 'duplicate') dup++;
    else errors.push(`${f.name}: ${r.message}`);
  }
  if (ok > 0) notifyActivitiesChanged();

  const parts: string[] = [];
  if (ok > 0) parts.push(`成功导入 ${ok} 条`);
  if (dup > 0) parts.push(`跳过重复 ${dup} 条`);
  if (errors.length > 0) parts.push(`失败 ${errors.length} 条`);
  showMessage(
    parts.join(',') || '没有可导入的 FIT 文件',
    errors.length ? errors.slice(0, 3).join('\n') : undefined
  );
}
