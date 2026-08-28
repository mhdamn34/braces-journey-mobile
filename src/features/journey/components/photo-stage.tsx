import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { monthLabel } from '@/features/journey/logic';
import type { JourneyEntry } from '@/features/journey/types';
import { formatShortDate } from '@/lib/dates';
import { Radii, Space, Type } from '@/theme/tokens';

export function PhotoStage({ entry, onPress }: { entry: JourneyEntry; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Open ${monthLabel(entry)} full screen`}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ borderRadius: Radii.stage, overflow: 'hidden' }}>
        {entry.photo ? (
          <Image
            source={{ uri: entry.photo.uri }}
            style={{ width: '100%', aspectRatio: 4 / 5 }}
            contentFit="cover"
            transition={120}
          />
        ) : null}
        <Text
          style={[
            Type.caption,
            {
              position: 'absolute',
              top: Space.md,
              left: Space.md,
              color: '#FFFFFF',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: Space.md,
              paddingVertical: Space.xs,
              borderRadius: Radii.pill,
              overflow: 'hidden',
              fontWeight: '600',
            },
          ]}
        >
          {formatShortDate(entry.date)}
        </Text>
      </View>
    </Pressable>
  );
}
