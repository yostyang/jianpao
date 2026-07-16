import type { Sample } from '../types/activity';

/** BigDataCloud 中文返回偶带繁体,做常用行政区划字符的繁→简 */
const T2S: Record<string, string> = {
  區: '区', 縣: '县', 鎮: '镇', 鄉: '乡', 灣: '湾', 島: '岛', 嶼: '屿', 門: '门',
  龍: '龙', 華: '华', 橋: '桥', 莊: '庄', 陽: '阳', 場: '场', 寧: '宁', 蘇: '苏',
  廣: '广', 濱: '滨', 豐: '丰', 雲: '云', 貴: '贵', 陝: '陕', 澤: '泽', 烏: '乌',
  齊: '齐', 內: '内', 蘭: '兰', 興: '兴', 靜: '静', 東: '东', 錫: '锡', 無: '无',
};

function toSimplified(s: string): string {
  return [...s].map((c) => T2S[c] ?? c).join('');
}

/**
 * 起点坐标 → 「上海市 · 松江区」。
 * 隐私:坐标先四舍五入到 2 位小数(约 1.1km)再发送,轨迹不出设备;失败返回 undefined。
 */
export async function reverseRegion(lat: number, lng: number): Promise<string | undefined> {
  const la = lat.toFixed(2);
  const lo = lng.toFixed(2);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${la}&longitude=${lo}&localityLanguage=zh`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return undefined;
    const j = await res.json();
    const city = toSimplified(j.city || j.principalSubdivision || '');
    const locality = toSimplified(j.locality || '');
    if (!city) return locality || undefined;
    if (!locality || locality === city) return city;
    return `${city} · ${locality}`;
  } catch {
    return undefined;
  }
}

/** 从采样点里取第一个 GPS 点查地区 */
export async function regionOfSamples(samples: Sample[]): Promise<string | undefined> {
  const g = samples.find((s) => s.lat != null && s.lng != null);
  if (!g) return undefined;
  return reverseRegion(g.lat as number, g.lng as number);
}
