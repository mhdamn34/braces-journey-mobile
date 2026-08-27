import { Pressable, Text } from 'react-native';

import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = { label: string; selected?: boolean; onPress?: () => void };

export function Chip({ label, selected = false, onPress }: Props) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.accent : colors.surface,
        borderColor: selected ? colors.accent : colors.border,
        borderWidth: 1,
        borderRadius: Radii.pill,
        paddingVertical: Space.xs + 2,
        paddingHorizontal: Space.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={[Type.label, { color: selected ? colors.onAccent : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}
