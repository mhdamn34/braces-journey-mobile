import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import type { TodaySummaryItem } from '@/features/dashboard/types';

type TodaySummaryCardProps = {
  items: TodaySummaryItem[];
};

const toneColors = {
  teal: BrandColors.teal,
  blue: BrandColors.blue,
  pink: BrandColors.pink,
  green: BrandColors.green,
  navy: BrandColors.navy,
} as const;

/**
 * Three-up "at-a-glance" summary strip.
 *
 * Each tile is a mini-card with a coloured leading dot, a big value,
 * and a friendly helper line.  Designed for one-handed scanning.
 */
export function TodaySummaryCard({ items }: TodaySummaryCardProps) {
  return (
    <Card tone="surface" style={styles.row}>
      {items.map((item, index) => {
        const color = toneColors[item.tone];
        return (
          <View
            key={item.label}
            style={[
              styles.tile,
              index !== items.length - 1 ? styles.tileDivider : undefined,
            ]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <ThemedText type="caption" themeColor="textSecondary">
              {item.label}
            </ThemedText>
            <ThemedText type="defaultBold" style={styles.value}>
              {item.value}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.helper}>
              {item.helper}
            </ThemedText>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: Spacing.two,
  },
  tile: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  tileDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.08)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.one,
  },
  value: {
    fontSize: 18,
    lineHeight: 22,
  },
  helper: {
    marginTop: 2,
  },
});
