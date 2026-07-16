import type { Sample } from '@/types/activity';

import { TrackSvg } from './TrackSvg';

/** Web 端没有原生地图,用简约 SVG 轨迹 */
export function TrackMap({ samples }: { samples: Sample[] }) {
  return <TrackSvg samples={samples} />;
}
