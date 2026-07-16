import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Accent, ChartColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lerpColor, paceColors } from '@/lib/paceColor';
import type { Sample } from '@/types/activity';

const VW = 1000;

/**
 * GPS 轨迹图(无底图,等距圆柱投影,保持真实纵横比)。
 * 有速度数据时按配速渐变着色,否则单色。
 */
export function TrackSvg({ samples }: { samples: Sample[] }) {
  const theme = useTheme();
  const gps = samples.filter((s) => s.lat != null && s.lng != null);
  if (gps.length < 2) return null;

  const stride = Math.max(1, Math.floor(gps.length / 400));
  const pts = gps.filter((_, i) => i % stride === 0 || i === gps.length - 1);

  const midLat = pts.reduce((a, p) => a + (p.lat as number), 0) / pts.length;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const xs = pts.map((p) => (p.lng as number) * kx);
  const ys = pts.map((p) => -(p.lat as number));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);

  const pad = 0.06 * Math.max(spanX, spanY);
  const scale = VW / (spanX + pad * 2);
  const vh = (spanY + pad * 2) * scale;

  const toX = (x: number) => (x - minX + pad) * scale;
  const toY = (y: number) => (y - minY + pad) * scale;
  const aspect = Math.min(2.2, Math.max(0.85, VW / vh));

  const colors = paceColors(pts);
  const colored = colors != null;
  const strokeW = VW / 110;

  return (
    <View>
      <Svg
        viewBox={`0 0 ${VW} ${vh.toFixed(0)}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', aspectRatio: aspect }}>
        {colored ? (
          pts.slice(1).map((_, i) => (
            <Line
              key={i}
              x1={toX(xs[i])}
              y1={toY(ys[i])}
              x2={toX(xs[i + 1])}
              y2={toY(ys[i + 1])}
              stroke={(colors as string[])[i + 1]}
              strokeWidth={strokeW}
              strokeLinecap="round"
            />
          ))
        ) : (
          <Polyline
            points={pts.map((_, i) => `${toX(xs[i]).toFixed(1)},${toY(ys[i]).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={Accent}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        <Circle cx={toX(xs[0])} cy={toY(ys[0])} r={VW / 52} fill={ChartColors.trackStart} />
        <Circle cx={toX(xs[xs.length - 1])} cy={toY(ys[ys.length - 1])} r={VW / 52} fill="#1C1C1E" />
      </Svg>
      {colored ? (
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>慢</Text>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <View key={t} style={[styles.legendCell, { backgroundColor: lerpColor(t) }]} />
          ))}
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>快</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  legendCell: { width: 16, height: 8, borderRadius: 3 },
  legendText: { fontSize: 11 },
});
