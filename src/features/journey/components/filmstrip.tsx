import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import type { JourneyEntry } from '@/features/journey/types';
import { Radii, Space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  entries: JourneyEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPlay: () => void;
};

export function Filmstrip({ entries, selectedId, onSelect, onPlay }: Props) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
      <Pressable
        onPress={onPlay}
        accessibilityLabel="Play my journey"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="play.fill" fallback="▶" size={16} tintColor={colors.onAccent} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
        {entries.map((entry) => {
          const selected = entry.id === selectedId;
          return (
            <Pressable key={entry.id} onPress={() => onSelect(entry.id)}>
              {entry.photo ? (
                <Image
                  source={{ uri: entry.photo.uri }}
                  style={{
                    width: selected ? 44 : 38,
                    height: selected ? 58 : 50,
                    borderRadius: Radii.thumb,
                    borderWidth: selected ? 2 : 0,
                    borderColor: colors.accent,
                    opacity: selected ? 1 : 0.6,
                  }}
                  contentFit="cover"
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
