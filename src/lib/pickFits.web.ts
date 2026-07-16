export interface PickedFit {
  name: string;
  data: ArrayBuffer;
}

/** Web 端:用 <input type=file> 多选 FIT 文件 */
export function pickFits(): Promise<PickedFit[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fit';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const out: PickedFit[] = [];
      for (const f of files) {
        if (!f.name.toLowerCase().endsWith('.fit')) continue;
        out.push({ name: f.name, data: await f.arrayBuffer() });
      }
      resolve(out);
    };
    // 取消选择时 change 不触发,用 cancel 事件兜底
    input.oncancel = () => resolve([]);
    input.click();
  });
}
