import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const colors = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: Space.xl, alignItems: 'center' }}>
      <Image
        source={require('@/assets/images/braces-journey-logo.png')}
        style={{ width: 96, height: 96 }}
        contentFit="contain"
      />
      <Text style={[Type.display, { color: colors.textPrimary, textAlign: 'center' }]}>
        One photo a month.
      </Text>
      <Text style={[Type.body, { color: colors.textSecondary, textAlign: 'center', maxWidth: 300 }]}>
        After every bracket change, capture your smile. BracesJourney lines the photos up so you
        can watch your teeth move.
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <Button label="Get started" onPress={onNext} />
      </View>
    </View>
  );
}
