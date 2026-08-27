import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Radii, Space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: Radii.card,
          padding: Space.lg,
          gap: Space.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
