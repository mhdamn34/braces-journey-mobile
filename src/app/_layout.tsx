import {
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/instrument-serif';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SaveErrorBanner } from '@/components/save-error-banner';
import { initAuth } from '@/features/auth/store';
import { useTheme } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync();

void initAuth();

export default function RootLayout() {
  const colors = useTheme();
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular_Italic });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="player" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="review" />
        <Stack.Screen name="compare" />
        <Stack.Screen name="import-photos" />
      </Stack>
      <SaveErrorBanner />
    </GestureHandlerRootView>
  );
}
