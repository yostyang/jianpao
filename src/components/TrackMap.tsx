import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Accent, ChartColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { wgs2gcj } from '@/lib/gcj';
import { paceColors } from '@/lib/paceColor';
import type { Sample } from '@/types/activity';

import { TrackSvg } from './TrackSvg';

// Expo Go 不含 react-native-maps 原生模块;Android 无 Google 服务时也不可用 → 回退 SVG
const isExpoGo = Constants.appOwnership === 'expo';
const mapAvailable = Platform.OS === 'ios' && !isExpoGo;

/** GPS 轨迹:iOS 开发构建显示 Apple 地图(标准/卫星),其余环境回退简约 SVG */
export function TrackMap({ samples }: { samples: Sample[] }) {
  if (!mapAvailable) return <TrackSvg samples={samples} />;
  return <NativeTrackMap samples={samples} />;
}

function NativeTrackMap({ samples }: { samples: Sample[] }) {
  const theme = useTheme();
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  // 惰性 require:只有确认地图可用才加载原生模块
  const Maps = require('react-native-maps') as typeof import('react-native-maps');
  const MapView = Maps.default;
  const { Marker, Polyline } = Maps;

  const { coords, colors, region } = useMemo(() => {
    const gps = samples.filter((s) => s.lat != null && s.lng != null);
    const stride = Math.max(1, Math.floor(gps.length / 400));
    const pts = gps.filter((_, i) => i % stride === 0 || i === gps.length - 1);
    const coords = pts.map((p) => wgs2gcj(p.lat as number, p.lng as number));
    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      coords,
      colors: paceColors(pts),
      region: {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max((maxLat - minLat) * 1.45, 0.006),
        longitudeDelta: Math.max((maxLng - minLng) * 1.45, 0.006),
      },
    };
  }, [samples]);

  if (coords.length < 2) return null;

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        initialRegion={region}
        mapType={mapType}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        showsPointsOfInterests={false}>
        <Polyline
          coordinates={coords}
          strokeWidth={4}
          strokeColor={Accent}
          strokeColors={colors ?? undefined}
          lineJoin="round"
          lineCap="round"
        />
        <Marker coordinate={coords[0]} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { backgroundColor: ChartColors.trackStart }]} />
        </Marker>
        <Marker coordinate={coords[coords.length - 1]} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { backgroundColor: '#1C1C1E' }]} />
        </Marker>
      </MapView>
      <View style={styles.toggle}>
        {(
          [
            { key: 'standard', label: '标准' },
            { key: 'hybrid', label: '卫星' },
          ] as const
        ).map((m) => (
          <Pressable
            key={m.key}
            onPress={() => setMapType(m.key)}
            style={[
              styles.toggleBtn,
              { backgroundColor: mapType === m.key ? theme.background : 'transparent' },
            ]}>
            <Text
              style={[
                styles.toggleText,
                { color: mapType === m.key ? Accent : theme.textSecondary },
              ]}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden' },
  map: { width: '100%', aspectRatio: 1.15 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  toggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.75)',
    padding: 2,
  },
  toggleBtn: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  toggleText: { fontSize: 12, fontWeight: '600' },
});
