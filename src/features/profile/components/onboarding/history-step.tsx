import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = { onImport: () => void; onFinish: () => void };

export function HistoryStep({ onImport, onFinish }: Props) {
  const colors = useTheme();
  return (
    <View style={{ flex: 1, gap: Space.lg, justifyContent: 'center' }}>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Bring your history</Text>
      <Text style={[Type.body, { color: colors.textSecondary }]}>
        Have photos from past months on your phone? Add them now and your flipbook starts complete
        — you can also do this later from Settings.
      </Text>
      <Button label="Add past photos" onPress={onImport} />
      <Button label="I'll start from today" variant="secondary" onPress={onFinish} />
    </View>
  );
}
