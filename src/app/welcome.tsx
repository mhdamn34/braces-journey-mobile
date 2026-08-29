import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function WelcomeScreen() {
  const colors = useTheme();

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: Space.md }}>
        <Text style={[Type.display, { color: colors.textPrimary, textAlign: 'center' }]}>
          BracesJourney
        </Text>
        <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          One photo a month. Watch your smile move.
        </Text>
      </View>
      <View style={{ gap: Space.sm }}>
        <Button label="Create account" onPress={() => router.push('/create-account')} />
        <Button label="Sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
      </View>
    </Screen>
  );
}
