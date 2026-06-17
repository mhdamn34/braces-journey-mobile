import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * AppBackground renders a soft, friendly wash behind every screen.
 *
 * - A base color covers the full screen.
 * - Two large gradient orbs (teal/pink top-right, blue bottom-left) are
 *   layered on top to give the app a warm, lively glow without competing
 *   with foreground content.
 *
 * The orbs are simply large colored circles — no SVG/Blur deps — so this
 * works everywhere (web, Android, iOS).
 */
export function AppBackground() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const base = isDark ? '#0A0F1A' : '#F4F8FE';
  const orbA = isDark ? 'rgba(33, 184, 199, 0.28)' : 'rgba(33, 184, 199, 0.32)';
  const orbB = isDark ? 'rgba(90, 110, 232, 0.22)' : 'rgba(90, 110, 232, 0.28)';
  const orbC = isDark ? 'rgba(232, 77, 173, 0.18)' : 'rgba(232, 77, 173, 0.28)';

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: base }]}>
      <View
        style={[
          styles.orb,
          {
            top: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: 210,
            backgroundColor: orbA,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            bottom: -160,
            left: -140,
            width: 460,
            height: 460,
            borderRadius: 230,
            backgroundColor: orbB,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            top: 240,
            right: 60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: orbC,
          },
        ]}
      />
      {/* Subtle brand-tinted bottom band keeps the tab bar area calm */}
      <View
        style={[
          styles.bottomBand,
          { backgroundColor: isDark ? 'rgba(20,27,39,0.6)' : 'rgba(255,255,255,0.55)' },
        ]}
      />
    </View>
  );
}

// On web, true border-radius values >50% don't always clip to a circle; force
// the layout with a fixed size and let the rounded corners finish the job.
const styles = StyleSheet.create({
  orb: Platform.select<ViewStyle>({
    web: { opacity: 0.9, filter: 'blur(40px)' as unknown as undefined },
    default: { opacity: 1 },
  }) as ViewStyle,
  bottomBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
});

// Re-export the brand palette for screens that need to tint their cards
// in a way that matches the orbs.
export { BrandColors };
