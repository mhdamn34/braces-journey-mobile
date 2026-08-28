import { Pressable, Text } from 'react-native';

import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function DuePrompt({ monthNumber, onPress }: { monthNumber: number; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.accent,
        borderRadius: Radii.card,
        paddingVertical: Space.md,
        paddingHorizontal: Space.lg,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={[Type.label, { color: colors.onAccent, textAlign: 'center' }]}>
        Month {monthNumber} is due — capture now
      </Text>
    </Pressable>
  );
}
