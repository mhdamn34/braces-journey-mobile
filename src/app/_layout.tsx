import {
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/instrument-serif';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SaveErrorBanner } from '@/components/save-error-banner';
import { authStore, initAuth } from '@/features/auth/store';
import { refreshAllApiStores } from '@/lib/store/create-api-store';
import { useTheme } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync();

void initAuth();

export default function RootLayout() {
  const colors = useTheme();
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular_Italic });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Cold-start refresh for an already-signed-in app arrives via sign-in
  // routing (fresh sign-in) or this listener's first 'active' transition —
  // no separate launch-time one-shot is added here.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && authStore.get().status === 'signedIn') {
        void refreshAllApiStores();
      }
    });
    return () => subscription.remove();
  }, []);

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
        <Stack.Screen name="migrate" options={{ gestureEnabled: false }} />
        <Stack.Screen name="merge-months" options={{ gestureEnabled: false }} />
      </Stack>
      <SaveErrorBanner />
    </GestureHandlerRootView>
  );
}
