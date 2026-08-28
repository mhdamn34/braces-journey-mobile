import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
};

export function ListRow({ title, subtitle, onPress, right }: Props) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: Radii.card,
        padding: Space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Space.md,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[Type.body, { color: colors.textPrimary, fontWeight: '600' }]}>{title}</Text>
        {subtitle ? (
          <Text style={[Type.caption, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right ?? (onPress ? (
        <Icon name="chevron.right" fallback="›" size={14} tintColor={colors.textTertiary} />
      ) : null)}
    </Pressable>
  );
}
