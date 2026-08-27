import { Text, View } from 'react-native';

import { Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function Placeholder() {
  const colors = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Month 7</Text>
    </View>
  );
}
