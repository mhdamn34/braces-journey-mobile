import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { type Href, Slot, usePathname } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { mainTabs } from '@/constants/main-tabs';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  const pathname = usePathname();
  const normalizedPathname = pathname.length > 1 && pathname.endsWith('/') 
    ? pathname.slice(0, -1) 
    : pathname;
  const isTab = mainTabs.some((tab) => tab.href === normalizedPathname);

  if (!isTab) {
    return <Slot />;
  }

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {mainTabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as Href} asChild>
              <TabButton icon={tab.symbol}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  icon,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: SymbolViewProps['name'] }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const tintColor = isFocused ? colors.text : colors.textSecondary;

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <SymbolView name={icon} tintColor={tintColor} size={14} />
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <View style={styles.brandBlock}>
          <SymbolView
            tintColor={colors.text}
            name={{ ios: 'face.smiling', android: 'health_and_safety', web: 'health_and_safety' }}
            size={16}
          />
          <ThemedText type="smallBold" style={styles.brandText}>
            BracesJourney
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroller}>
          {props.children}
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    zIndex: 1,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: Spacing.two,
  },
  brandText: {
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  tabsScroller: {
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  tabButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    minHeight: 32,
  },
});
