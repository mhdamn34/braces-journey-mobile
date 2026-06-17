import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BrandColors,
  Radii,
  Shadows,
  Spacing,
  Tints,
} from '@/constants/theme';
import { scoreTone } from '@/features/capture/data/capture';
import type { CaptureHint, VerificationResult } from '@/features/capture/types';

type AnalysisResultCardProps = {
  result: VerificationResult;
  variant?: 'perfect' | 'try-again';
};

/**
 * Shown after the verification API returns. Two variants:
 *   - `perfect`: big score, "Looking great" message, single save CTA
 *   - `try-again`: score + hints, retake / save-anyway CTAs
 */
export function AnalysisResultCard({ result, variant }: AnalysisResultCardProps) {
  const tone = scoreTone(result.score);
  const tint = Tints[tone];
  const isPerfect = variant
    ? variant === 'perfect'
    : result.isAcceptable;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tint.soft, borderColor: tint.line },
        Shadows.soft,
      ]}>
      <View style={styles.headerRow}>
        <View
          style={[styles.scoreBubble, { backgroundColor: BrandColors[tone] }]}>
          <ThemedText style={styles.scoreText}>{result.score}</ThemedText>
        </View>
        <View style={styles.headerText}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.kicker}>
            {isPerfect ? 'PERFECT POSITION' : 'NEEDS ANOTHER TRY'}
          </ThemedText>
          <ThemedText type="subtitle">
            {isPerfect ? 'Saved-ready' : 'Almost there'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.hintsList}>
        {result.hints.map((hint) => (
          <HintRow key={hint.issue} hint={hint} />
        ))}
      </View>
    </View>
  );
}

function HintRow({ hint }: { hint: CaptureHint }) {
  const tint = Tints[hint.tone];
  return (
    <View
      style={[
        styles.hintRow,
        { backgroundColor: tint.soft, borderColor: tint.line },
      ]}>
      <View style={[styles.hintDot, { backgroundColor: BrandColors[hint.tone] }]} />
      <View style={styles.hintText}>
        <ThemedText type="smallBold">{hint.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint.detail}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  scoreBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    letterSpacing: 1,
  },
  hintsList: {
    gap: Spacing.two,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  hintDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  hintText: {
    flex: 1,
    gap: 2,
  },
});
