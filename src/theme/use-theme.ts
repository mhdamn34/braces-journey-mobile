import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from '@/theme/tokens';

export function useTheme(): ThemeColors {
  return useColorScheme() === 'dark' ? darkColors : lightColors;
}
