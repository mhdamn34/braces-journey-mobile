import { Image } from 'expo-image';
import { View } from 'react-native';

import { alignmentTransform } from '@/features/capture/alignment/transform';
import type { Arch } from '@/features/capture/alignment/types';
import type { JourneyEntry } from '@/features/journey/types';

type Props = { entry: JourneyEntry; stageWidth: number; arch: Arch };

/** Renders an entry's photo normalized into the canonical frame. Falls back to
 * plain cover when the photo has no landmarks — never stretches to fake a fit. */
export function AlignedPhoto({ entry, stageWidth, arch }: Props) {
  const photo = entry.photo;
  if (!photo) return null;

  const transform = entry.alignment
    ? alignmentTransform(entry.alignment, { width: photo.width, height: photo.height }, arch)
    : null;

  // tx and ty are both in square units — scale BOTH by stage width, never height.
  const style = transform
    ? {
        transform: [
          { translateX: transform.tx * stageWidth },
          { translateY: transform.ty * stageWidth },
          { rotate: `${transform.rotationRad}rad` },
          { scale: transform.scale },
        ],
      }
    : undefined;

  return (
    <View style={[{ width: '100%', height: '100%' }, style]}>
      <Image
        source={{ uri: photo.uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={120}
      />
    </View>
  );
}
