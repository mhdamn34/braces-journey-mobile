import { Text } from 'react-native';

import { Screen } from '@/components/screen';
import { Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function JourneyScreen() {
  const colors = useTheme();
  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Journey</Text>
    </Screen>
  );
}
