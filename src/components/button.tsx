import { Pressable, Text } from 'react-native';

import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const colors = useTheme();
  const background =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surface : 'transparent';
  const textColor =
    variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: background,
        borderColor: variant === 'secondary' ? colors.border : 'transparent',
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderRadius: Radii.pill,
        paddingVertical: Space.md,
        paddingHorizontal: Space.xl,
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      })}
    >
      <Text style={[Type.label, { color: textColor, fontSize: 15 }]}>{label}</Text>
    </Pressable>
  );
}
