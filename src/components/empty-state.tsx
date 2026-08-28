import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = { voice: string; body: string; children?: ReactNode };

export function EmptyState({ voice, body, children }: Props) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: Space.md, paddingVertical: Space.xxxl }}>
      <Text style={[Type.title, { color: colors.textPrimary, textAlign: 'center' }]}>{voice}</Text>
      <Text
        style={[Type.body, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }]}
      >
        {body}
      </Text>
      {children ? <View style={{ marginTop: Space.sm, gap: Space.sm, alignSelf: 'stretch' }}>{children}</View> : null}
    </View>
  );
}
