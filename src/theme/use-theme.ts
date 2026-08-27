import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from '@/theme/tokens';

const ForcedThemeContext = createContext<ThemeColors | null>(null);

/** Forces a palette on a subtree regardless of the system scheme —
 * used by Screen's `dark` prop for the always-dark camera/review/compare. */
export const ForcedTheme = ForcedThemeContext.Provider;

export function useTheme(): ThemeColors {
  const forced = useContext(ForcedThemeContext);
  const systemDark = useColorScheme() === 'dark';
  return forced ?? (systemDark ? darkColors : lightColors);
}
