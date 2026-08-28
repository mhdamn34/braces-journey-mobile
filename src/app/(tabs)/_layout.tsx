import { Redirect, Tabs } from 'expo-router';

import { Symbol } from '@/components/symbol';
import { profileStore } from '@/features/profile/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { useTheme } from '@/theme/use-theme';

export default function TabsLayout() {
  const colors = useTheme();
  const profile = useStoreValue(profileStore);

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
            <Symbol name="photo.stack" fallback="◧" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }) => (
            <Symbol name="camera" fallback="◉" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Symbol name="ellipsis.circle" fallback="⋯" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
