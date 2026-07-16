import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export interface PickedFit {
  name: string;
  data: ArrayBuffer;
}

/** 原生端:系统文件选择器多选 FIT 文件并读出字节 */
export async function pickFits(): Promise<PickedFit[]> {
  const res = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (res.canceled) return [];
  const out: PickedFit[] = [];
  for (const asset of res.assets) {
    if (!asset.name.toLowerCase().endsWith('.fit')) continue;
    const bytes = await new File(asset.uri).bytes();
    out.push({
      name: asset.name,
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
  }
  return out;
}
