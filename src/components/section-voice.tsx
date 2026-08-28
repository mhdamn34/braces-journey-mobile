import { Pressable, Text, View } from 'react-native';

import { Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = { title: string; actionLabel?: string; onAction?: () => void };

export function SectionVoice({ title, actionLabel, onAction }: Props) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text style={[Type.voice, { color: colors.textSecondary }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[Type.label, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
