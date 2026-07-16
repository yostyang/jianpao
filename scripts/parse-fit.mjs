// FIT 解析冒烟测试:node scripts/parse-fit.mjs <file1.fit> [file2.fit ...]
// 依赖 Node 22.18+ 的原生 TS type-stripping 直接导入 src 里的解析器
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { formatDistance, formatDuration, formatPace, parseFit } from '../src/fit/parser.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法: node scripts/parse-fit.mjs <file.fit> ...');
  process.exit(1);
}

for (const file of files) {
  const buf = readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  try {
    const { summary, samples } = parseFit(ab);
    console.log(`\n=== ${basename(file)} ===`);
    console.log(`名称: ${summary.name}   类型: ${summary.sport} (${summary.sportRaw})`);
    console.log(`开始: ${new Date(summary.startTime).toLocaleString('zh-CN')}`);
    console.log(
      `距离: ${formatDistance(summary.distance)}   计时: ${formatDuration(summary.duration)}   总时长: ${formatDuration(summary.elapsed)}`
    );
    console.log(
      `配速: ${formatPace(summary.avgPace)}   心率: ${summary.avgHr ?? '-'} / max ${summary.maxHr ?? '-'}   步频: ${summary.avgCadence ?? '-'}   爬升: ${summary.elevGain ?? '-'}m   卡路里: ${summary.calories ?? '-'}`
    );
    console.log(`采样点: ${samples.length}   GPS: ${summary.hasTrack ? '有' : '无'}`);
    if (summary.splits.length) {
      console.log('分段:');
      for (const sp of summary.splits) {
        console.log(
          `  ${String(sp.index).padStart(2)}km  ${formatPace(sp.pace)}  hr ${sp.avgHr ?? '-'}  +${sp.elevGain ?? 0}m  (${sp.distance}m)`
        );
      }
    }
    const g = samples.find((s) => s.lat != null);
    if (g) console.log(`首个 GPS 点: ${g.lat?.toFixed(5)}, ${g.lng?.toFixed(5)}`);
  } catch (e) {
    console.error(`\n=== ${basename(file)} === 解析失败: ${e.message}`);
    process.exitCode = 1;
  }
}
