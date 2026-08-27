import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { darkColors, Space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  dark?: boolean;
};

export function Screen({ children, scroll = true, padded = true, dark = false }: Props) {
  const systemColors = useTheme();
  const colors = dark ? darkColors : systemColors;
  const padding = padded ? Space.lg : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ padding, gap: Space.lg, paddingBottom: Space.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding, gap: Space.lg }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
