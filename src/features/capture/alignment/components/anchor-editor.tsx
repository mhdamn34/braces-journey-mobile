import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { FaceAlignment, Point } from '@/features/capture/alignment/types';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

const STEPS = [
  { key: 'leftEye', label: 'Tap your left eye' },
  { key: 'rightEye', label: 'Tap your right eye' },
  { key: 'noseBase', label: 'Tap the base of your nose' },
  { key: 'chin', label: 'Tap the bottom of your chin' },
] as const;

type Props = { uri: string; onComplete: (alignment: FaceAlignment) => void };

/** Four taps on the STORED photo — never a preview, so front-camera mirroring
 * and EXIF rotation cannot leak into the coordinates. */
export function AnchorEditor({ uri, onComplete }: Props) {
  const [points, setPoints] = useState<Point[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const step = STEPS[points.length];

  function tap(x: number, y: number) {
    if (!step || size.width === 0) return;
    const next = [...points, { x: x / size.width, y: y / size.height }];
    setPoints(next);
    if (next.length === STEPS.length) onComplete(build(next));
  }

  return (
    <View>
      <Pressable
        onLayout={(e) => setSize(e.nativeEvent.layout)}
        onPress={(e) => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        style={{ borderRadius: Radii.stage, overflow: 'hidden', aspectRatio: 4 / 5 }}
      >
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        {points.map((p, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: p.x * size.width - 8,
              top: p.y * size.height - 8,
              width: 16,
              height: 16,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              backgroundColor: darkColors.accent,
            }}
          />
        ))}
      </Pressable>
      <Text
        style={[
          Type.caption,
          { color: darkColors.accent, textAlign: 'center', marginTop: Space.md },
        ]}
      >
        {step ? step.label : 'All four placed'}
      </Text>
    </View>
  );
}

function build(points: Point[]): FaceAlignment {
  const [leftEye, rightEye, noseBase, chin] = points;
  const ipd = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  return {
    leftEye,
    rightEye,
    noseBase,
    chin,
    rollDeg: (Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180) / Math.PI,
    yawDeg: 0, // taps cannot measure head turn — quality.ts skips yaw for source 'taps'
    openingRatio: ipd > 0 ? Math.hypot(chin.x - noseBase.x, chin.y - noseBase.y) / ipd : 0,
    source: 'taps',
    version: 1,
  };
}
