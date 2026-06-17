import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { mainTabs } from '@/constants/main-tabs';
import { BrandColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Bottom tab bar — uses a slightly translucent material so the soft
 * AppBackground gradient peeks through, with a brand-tinted selected state.
 */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  // iOS uses a translucent system material; Android needs an opaque tint
  // that matches the screen surface.
  const backgroundColor =
    Platform.OS === 'ios' ? 'rgba(255,255,255,0.85)' : colors.backgroundElement;
  const darkBackgroundColor =
    Platform.OS === 'ios' ? 'rgba(20,27,39,0.9)' : colors.backgroundElement;

  return (
    <NativeTabs
      backgroundColor={scheme === 'dark' ? darkBackgroundColor : backgroundColor}
      iconColor={{ default: colors.textSecondary, selected: BrandColors.teal }}
      tintColor={BrandColors.teal}
      indicatorColor={scheme === 'dark' ? 'rgba(33,184,199,0.18)' : 'rgba(33,184,199,0.16)'}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
        selected: { color: BrandColors.teal, fontSize: 11, fontWeight: '700' },
      }}>
      {mainTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
