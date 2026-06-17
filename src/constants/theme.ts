/**
 * BracesJourney design system.
 *
 * - Colors: light/dark semantic tokens for surfaces and text.
 * - BrandColors: the brand palette (navy / teal / blue / pink / green).
 * - Tints: low-opacity versions of the brand colors used for soft card
 *   backgrounds, pill tags, and progress tracks.
 * - Radii / Spacing / FontSizes / Shadows: shared visual tokens so screens
 *   stay consistent.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0E1A2B',
    textSecondary: '#5E6B7E',
    background: '#F5F8FE',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EAF2FF',
    border: '#E5ECF5',
  },
  dark: {
    text: '#F4F7FB',
    textSecondary: '#A2AEC2',
    background: '#0A0F1A',
    backgroundElement: '#141B27',
    backgroundSelected: '#1E2A3D',
    border: '#1F2A3B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const BrandColors = {
  navy: '#0B2A5B',
  teal: '#21B8C7',
  blue: '#5A6EE8',
  pink: '#E84DAD',
  green: '#208A6B',
} as const;

/**
 * Soft tints (low-opacity brand colors) for backgrounds.
 * Use them instead of hardcoded hex strings inside components.
 */
export const Tints = {
  teal: {
    soft: '#D9F4F7',
    softer: '#EAF9FB',
    line: 'rgba(33, 184, 199, 0.18)',
  },
  blue: {
    soft: '#E0E6FA',
    softer: '#EEF1FD',
    line: 'rgba(90, 110, 232, 0.18)',
  },
  pink: {
    soft: '#FBE0F0',
    softer: '#FDEEF7',
    line: 'rgba(232, 77, 173, 0.18)',
  },
  green: {
    soft: '#DCEFE6',
    softer: '#EAF6F0',
    line: 'rgba(32, 138, 107, 0.18)',
  },
  navy: {
    soft: '#E1E8F4',
    softer: '#EFF3FA',
    line: 'rgba(11, 42, 91, 0.16)',
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Spacing scale (4pt grid). `Spacing` is the legacy export used by older
 * components; new code should prefer these named values.
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export const FontSizes = {
  caption: 12,
  small: 14,
  body: 16,
  title: 22,
  display: 28,
  hero: 40,
} as const;

export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

/**
 * Shadow presets. The "brand" variants use a soft teal/blue tint so cards
 * feel like they sit on the app background instead of on top of a generic
 * black drop shadow.
 */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0B2A5B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: { elevation: 3 },
    default: {},
  }) as object,
  soft: Platform.select({
    ios: {
      shadowColor: '#0B2A5B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  hero: Platform.select({
    ios: {
      shadowColor: '#21B8C7',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    android: { elevation: 6 },
    default: {},
  }) as object,
  pink: Platform.select({
    ios: {
      shadowColor: '#E84DAD',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 22,
    },
    android: { elevation: 5 },
    default: {},
  }) as object,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const TopTabInset = Platform.select({ web: 104, default: 0 }) ?? 0;
export const MaxContentWidth = 800;
