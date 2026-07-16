import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { ChartColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const W = 600;
const H = 200;
const LABEL_H = 26;

export interface Bar {
  label: string;
  value: number;
}

interface Props {
  title: string;
  bars: Bar[];
  /** 柱顶标注格式化,如 12.5(公里数) */
  format: (v: number) => string;
}

/** 简约柱状图(周跑量) */
export function BarChart({ title, bars, format }: Props) {
  const theme = useTheme();
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const gap = 10;
  const bw = (W - gap * (bars.length + 1)) / bars.length;
  const chartH = H - LABEL_H - 22;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', aspectRatio: W / H }}>
        {bars.map((b, i) => {
          const h = b.value > 0 ? Math.max((b.value / max) * chartH, 4) : 2;
          const x = gap + i * (bw + gap);
          const y = 22 + (chartH - h);
          const isMax = b.value === max && b.value > 0;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={bw}
                height={h}
                rx={5}
                fill={b.value > 0 ? ChartColors.bar : theme.backgroundSelected}
                opacity={b.value > 0 ? (isMax ? 1 : 0.55) : 1}
              />
              {isMax ? (
                <SvgText
                  x={x + bw / 2}
                  y={y - 7}
                  fontSize={16}
                  fontWeight="600"
                  fill={theme.text}
                  textAnchor="middle">
                  {format(b.value)}
                </SvgText>
              ) : null}
              {i % 2 === bars.length % 2 ? (
                <SvgText
                  x={x + bw / 2}
                  y={H - 8}
                  fontSize={14}
                  fill={theme.textSecondary}
                  textAnchor="middle">
                  {b.label}
                </SvgText>
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
});
