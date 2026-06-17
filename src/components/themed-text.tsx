import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'caption'
    | 'small'
    | 'smallBold'
    | 'default'
    | 'defaultBold'
    | 'subtitle'
    | 'title'
    | 'display'
    | 'hero'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'caption' && styles.caption,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'default' && styles.default,
        type === 'defaultBold' && styles.defaultBold,
        type === 'subtitle' && styles.subtitle,
        type === 'title' && styles.title,
        type === 'display' && styles.display,
        type === 'hero' && styles.hero,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 34,
  },
  display: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  hero: {
    fontSize: 40,
    fontWeight: 700,
    lineHeight: 44,
    letterSpacing: -1,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
