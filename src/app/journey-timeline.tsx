import { StyleSheet, View } from 'react-native';

import {
  Card,
  CardList,
  HeroCard,
  MainScreen,
  Pill,
  SectionHeading,
} from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Radii, Spacing } from '@/constants/theme';

type TimelineItem = {
  date: string;
  title: string;
  description: string;
  tag: 'Pain note' | 'Color' | 'Treatment';
  tone: 'teal' | 'pink' | 'blue' | 'green';
};

const timelineItems: TimelineItem[] = [
  {
    date: 'May 24',
    title: 'Soreness improving',
    description: 'Pain level dropped from 4 to 2 after the last adjustment.',
    tag: 'Pain note',
    tone: 'pink',
  },
  {
    date: 'May 12',
    title: 'Blue ligatures selected',
    description: 'Color change logged with the monthly progress photo.',
    tag: 'Color',
    tone: 'blue',
  },
  {
    date: 'Apr 5',
    title: 'Elastic routine updated',
    description: 'Orthodontist recommended wearing elastics during the day and overnight.',
    tag: 'Treatment',
    tone: 'teal',
  },
  {
    date: 'Mar 1',
    title: 'Wire change',
    description: 'Heavier wire placed to continue alignment progress.',
    tag: 'Treatment',
    tone: 'teal',
  },
];

const colorHistory: { name: string; color: string }[] = [
  { name: 'Blue', color: '#3B6BFF' },
  { name: 'Silver', color: '#B9C2D0' },
  { name: 'Green', color: '#37C18B' },
  { name: 'Pink', color: '#F37AB6' },
];

/**
 * Journey Timeline screen (linked from the More tab).
 *
 * Layout:
 *   1. Hero summary card
 *   2. Vertical timeline with color-tagged entries
 *   3. Color history swatches
 *   4. Monthly check-in tip
 */
export default function JourneyTimelineScreen() {
  return (
    <MainScreen
      title="Journey Timeline"
      subtitle="Review color changes, pain notes, treatment updates, and visible progress over time.">
      <HeroCard tone="blue">
        <View style={styles.heroTop}>
          <Pill tone="blue" size="sm">
            🗓 4 months in
          </Pill>
          <Pill tone="blue" size="sm">
            {timelineItems.length} updates
          </Pill>
        </View>
        <View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.heroLabel}>
            KEEP GOING
          </ThemedText>
          <ThemedText type="display" style={styles.heroTitle}>
            Your story so far
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Notes, colors, and treatment changes — all in one place.
          </ThemedText>
        </View>
      </HeroCard>

      <SectionHeading>Recent updates</SectionHeading>
      <View style={styles.timeline}>
        {timelineItems.map((item, index) => (
          <View key={`${item.date}-${item.title}`} style={styles.timelineRow}>
            <View style={styles.timelineGutter}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: BrandColors[item.tone] },
                ]}
              />
              {index < timelineItems.length - 1 ? (
                <View style={styles.timelineLine} />
              ) : null}
            </View>
            <View style={styles.timelineContent}>
              <Card
                title={item.title}
                description={item.description}
                tone="surface"
                meta={item.date}>
                <Pill tone={item.tone} size="sm">
                  {item.tag}
                </Pill>
              </Card>
            </View>
          </View>
        ))}
      </View>

      <SectionHeading>Color history</SectionHeading>
      <CardList>
        <Card title="Your braces color story" tone="pink">
          <View style={styles.colorRow}>
            {colorHistory.map((entry) => (
              <View key={entry.name} style={styles.colorItem}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: entry.color },
                  ]}
                />
                <ThemedText type="smallBold">{entry.name}</ThemedText>
              </View>
            ))}
          </View>
        </Card>
      </CardList>

      <ThemedView type="backgroundElement" style={styles.checkInCard}>
        <ThemedText type="defaultBold">💡 Monthly check-in</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Log your comfort level and take a photo from the same angle after
          each adjustment.
        </ThemedText>
      </ThemedView>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  heroLabel: {
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  timelineGutter: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: Spacing.three,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#DCE6F2',
    marginTop: Spacing.one,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.three,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  checkInCard: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    gap: Spacing.two,
    shadowColor: BrandColors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
});
