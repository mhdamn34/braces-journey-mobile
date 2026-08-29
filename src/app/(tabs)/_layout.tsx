import { Redirect, Tabs } from 'expo-router';

import { Icon } from '@/components/icon';
import { authStore } from '@/features/auth/store';
import { profileStore } from '@/features/profile/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { useTheme } from '@/theme/use-theme';

export default function TabsLayout() {
  const colors = useTheme();
  const auth = useStoreValue(authStore);
  const profile = useStoreValue(profileStore);

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Redirect href="/welcome" />;
  if (!profile.onboardedAt) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, size }) => (
            <Icon name="photo.stack" fallback="◧" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }) => (
            <Icon name="camera" fallback="◉" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Icon name="ellipsis.circle" fallback="⋯" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
