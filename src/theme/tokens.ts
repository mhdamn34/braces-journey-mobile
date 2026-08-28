import type { TextStyle } from 'react-native';

export type ThemeColors = {
  bg: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  onAccent: string;
  danger: string;
};

export const lightColors: ThemeColors = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  border: '#EDEDE9',
  textPrimary: '#1A1A1E',
  textSecondary: '#6E6E76',
  textTertiary: '#A0A0A8',
  accent: '#B0563F',
  onAccent: '#FFFFFF',
  danger: '#C24A4A',
};

export const darkColors: ThemeColors = {
  bg: '#141417',
  surface: '#1E1E23',
  border: '#2A2A31',
  textPrimary: '#F2F2F5',
  textSecondary: '#9A9AA4',
  textTertiary: '#6E6E78',
  accent: '#DD7A58',
  onAccent: '#23120B',
  danger: '#E07070',
};

// Loaded in app/_layout.tsx. If Task 1 fell back to Fraunces, change both names here only.
export const Serif = 'InstrumentSerif_400Regular_Italic';

export const Type = {
  display: { fontFamily: Serif, fontSize: 30, lineHeight: 36 } as TextStyle,
  title: { fontFamily: Serif, fontSize: 20, lineHeight: 26 } as TextStyle,
  voice: { fontFamily: Serif, fontSize: 15, lineHeight: 20 } as TextStyle,
  body: { fontSize: 15, lineHeight: 21 } as TextStyle,
  label: { fontSize: 13, fontWeight: '600' } as TextStyle,
  caption: { fontSize: 12, lineHeight: 16 } as TextStyle,
  micro: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  } as TextStyle,
};

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const Radii = { thumb: 6, card: 12, stage: 18, pill: 999 } as const;
