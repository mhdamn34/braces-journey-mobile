import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { ColorDot } from '@/components/color-dot';
import { monthLabel } from '@/features/journey/logic';
import type { JourneyEntry } from '@/features/journey/types';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function EntryRow({ entry, onPress }: { entry: JourneyEntry; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space.md,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: Radii.card,
        padding: Space.md,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {entry.photo ? (
        <Image
          source={{ uri: entry.photo.uri }}
          style={{ width: 44, height: 44, borderRadius: Radii.thumb }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[Type.body, { color: colors.textPrimary, fontWeight: '600' }]}>
          {monthLabel(entry)}
        </Text>
        {entry.note ? (
          <Text numberOfLines={1} style={[Type.caption, { color: colors.textSecondary }]}>
            {entry.note}
          </Text>
        ) : null}
      </View>
      {entry.bracketColor ? <ColorDot hex={entry.bracketColor.hex} /> : null}
    </Pressable>
  );
}
