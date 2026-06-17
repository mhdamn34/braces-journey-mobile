import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BrandColors,
  Radii,
  Shadows,
  Spacing,
  Tints,
} from '@/constants/theme';
import { AnalysisResultCard } from '@/features/capture/components/analysis-result-card';
import type { CaptureIssue } from '@/features/capture/types';
import { savePhoto } from '@/features/capture/services/photo-storage';
import { verifyPhoto } from '@/features/capture/services/photo-verification';
import { buildHints, scoreTone } from '@/features/capture/data/capture';
import type { VerificationResult } from '@/features/capture/types';

const MIN_RETAKE_MS = 600; // small guard so the back button doesn't trigger a re-analyze

export default function PhotoReviewScreen() {
  const params = useLocalSearchParams<{
    uri: string;
    width: string;
    height: string;
    score: string;
    isAcceptable: string;
    issues: string;
  }>();

  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reAnalyze, setReAnalyze] =
    useState<VerificationResult | null>(null);
  const [lastTapAt, setLastTapAt] = useState(0);

  const initialResult = parseResult(params);
  const result = reAnalyze ?? initialResult;

  // Re-analyze is treated as a fresh request even if the photo
  // uri is the same — we pass a tiny random salt to the mock so
  // the result feels different.
  async function handleRetake() {
    if (Date.now() - lastTapAt < MIN_RETAKE_MS) return;
    setLastTapAt(Date.now());
    try {
      setVerifying(true);
      Haptics.selectionAsync();
      const fresh = await verifyPhoto({
        uri: `${params.uri}?salt=${Date.now()}`,
        width: Number(params.width) || 0,
        height: Number(params.height) || 0,
      });
      setReAnalyze(fresh);
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await savePhoto({
        tmpUri: params.uri,
        width: Number(params.width) || 0,
        height: Number(params.height) || 0,
        score: result.score,
        isAcceptable: result.isAcceptable,
        issues: result.issues,
      });
      router.replace('/progress-gallery' as never);
    } finally {
      setSaving(false);
    }
  }

  function handleRetakeFull() {
    router.replace('/capture-photo' as never);
  }

  // Auto-trigger retake of a similar photo for fun? No — let the
  // user opt in. The "Try again" button re-runs verification; the
  // "Retake photo" button restarts the camera.

  useEffect(() => {
    if (result.isAcceptable) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText type="smallBold">‹ Back</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.headerTitle}>
          Review photo
        </ThemedText>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.previewWrap}>
        <Image
          source={{ uri: params.uri }}
          style={styles.preview}
          contentFit="cover"
          transition={250}
        />
        <View
          style={[
            styles.scorePill,
            {
              backgroundColor: BrandColors[scoreTone(result.score)],
            },
          ]}>
          <ThemedText style={styles.scorePillText}>{result.score}%</ThemedText>
        </View>
      </View>

      <AnalysisResultCard
        result={result}
        variant={result.isAcceptable ? 'perfect' : 'try-again'}
      />

      <View style={styles.actionRow}>
        {result.isAcceptable ? (
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save to gallery'}
            onPress={handleSave}
            tone="teal"
            disabled={saving}
          />
        ) : (
          <>
            <PrimaryButton
              label={verifying ? 'Re-checking…' : 'Try again'}
              onPress={handleRetake}
              tone="teal"
              disabled={verifying}
            />
            <PrimaryButton
              label="Save anyway"
              onPress={handleSave}
              tone="navy"
              outline
              disabled={saving}
            />
          </>
        )}
      </View>

      {!result.isAcceptable && (
        <Pressable onPress={handleRetakeFull} style={styles.retakeLink}>
          <ThemedText type="small" style={{ color: BrandColors.teal }}>
            Retake photo from scratch
          </ThemedText>
        </Pressable>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function PrimaryButton({
  label,
  onPress,
  tone,
  outline,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone: 'teal' | 'navy';
  outline?: boolean;
  disabled?: boolean;
}) {
  const tint = Tints[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        outline
          ? {
              backgroundColor: tint.soft,
              borderColor: BrandColors[tone],
              borderWidth: 1,
            }
          : { backgroundColor: BrandColors[tone] },
        Shadows.soft,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.primaryText,
          { color: outline ? BrandColors[tone] : '#FFFFFF' },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function parseResult(params: {
  score: string;
  isAcceptable: string;
  issues: string;
}): VerificationResult {
  const score = clampScore(Number(params.score) || 0);
  const isAcceptable = params.isAcceptable === '1';
  let issues: CaptureIssue[] = [];
  try {
    const raw = JSON.parse(params.issues ?? '[]') as string[];
    issues = raw.filter(isCaptureIssue);
  } catch {
    /* ignore */
  }
  return {
    score,
    isAcceptable,
    issues,
    hints: buildHints(issues),
    analyzedAt: new Date().toISOString(),
  };
}

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const ALL_ISSUES: CaptureIssue[] = [
  'tilt_left',
  'tilt_right',
  'too_close',
  'too_far',
  'out_of_frame',
  'low_light',
  'low_confidence',
];
function isCaptureIssue(s: string): s is CaptureIssue {
  return s === 'good' || (ALL_ISSUES as string[]).includes(s);
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F5F8FE',
  },
  container: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
  },
  backBtn: {
    width: 60,
    height: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  previewWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  scorePill: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
  },
  scorePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  primary: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.pill,
    alignItems: 'center',
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  retakeLink: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  spacer: {
    height: Spacing.four,
  },
});
