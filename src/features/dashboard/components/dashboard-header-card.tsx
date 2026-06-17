import { StyleSheet, View } from 'react-native';

import { HeroCard, ProgressBar, ProgressRing } from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { TreatmentSummary } from '@/features/dashboard/types';

type Props = {
  summary: TreatmentSummary;
};

/**
 * Hero treatment card.
 *
 * Layout:
 *   - Big progress ring on the left (the visual anchor of the home tab)
 *   - Friendly copy + key stats on the right
 *   - Subtle month progress bar at the bottom
 *
 * Uses the "teal" tint because progress/treatment is the brand's primary hue.
 */
export function DashboardHeaderCard({ summary }: Props) {
  const monthsPercent = Math.round(
    (summary.monthsCompleted / summary.monthsTotal) * 100,
  );

  return (
    <HeroCard tone="teal" style={styles.hero}>
      <View style={styles.row}>
        <ProgressRing
          percent={summary.progressPercent}
          size={148}
          strokeWidth={14}
          tone="teal"
          centerLabel="Progress"
          centerValue={`${summary.progressPercent}%`}
          centerHint={summary.currentStage}
        />
        <View style={styles.copy}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
            TREATMENT
          </ThemedText>
          <ThemedText type="subtitle">{summary.currentStage}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
            {summary.monthsCompleted} of {summary.monthsTotal} months complete
          </ThemedText>
          <View style={styles.divider} />
          <ThemedText type="caption" themeColor="textSecondary">
            NEXT VISIT
          </ThemedText>
          <ThemedText type="defaultBold">{summary.nextAppointment}</ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <ThemedText type="caption" themeColor="textSecondary">
            MONTHS
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {summary.monthsCompleted}/{summary.monthsTotal}
          </ThemedText>
        </View>
        <ProgressBar percent={monthsPercent} tone="teal" height={8} />
      </View>
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  meta: {
    letterSpacing: 1,
  },
  line: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(33,184,199,0.25)',
    marginVertical: Spacing.two,
  },
  footer: {
    gap: Spacing.one,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
