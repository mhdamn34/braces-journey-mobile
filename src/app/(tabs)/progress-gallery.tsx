import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  CardList,
  HeroCard,
  MainScreen,
  Pill,
  SectionHeading,
} from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { CartoonSmileMap } from '@/features/progress-gallery/components/cartoon-smile-map';
import { PhotoAnalysisCard } from '@/features/progress-gallery/components/photo-analysis-card';
import { PhotoLogCard } from '@/features/progress-gallery/components/photo-log-card';
import {
  cartoonMapPoints,
  latestPhotoAnalysis,
  photoLogs,
} from '@/features/progress-gallery/data/progress-gallery';

/**
 * Photos / Progress Gallery tab.
 *
 * Layout:
 *   1. Hero card with "latest photo" snapshot, confidence, and CTAs
 *   2. Photo analysis (alignment, spacing, smile arc) using ProgressBar
 *   3. Cartoon smile map centerpiece
 *   4. Photo log timeline
 *   5. Capture checklist
 *
 * The hero CTAs route into the new capture flow:
 *   - "Take photo" -> /capture-photo (live camera)
 *   - "Compare"    -> /compare-photos (side-by-side)
 */
export default function ProgressGalleryScreen() {
  return (
    <MainScreen
      title="Smile progress"
      subtitle="Compare monthly photos and watch the smile arc improve.">
      <HeroCard tone="pink">
        <View style={styles.heroTop}>
          <Pill tone="pink" size="sm">
            📸 May snapshot
          </Pill>
          <Pill tone="pink" size="sm">
            82% confidence
          </Pill>
        </View>
        <View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.heroLabel}>
            LATEST PHOTO ANALYSIS
          </ThemedText>
          <ThemedText type="display" style={styles.heroTitle}>
            You’re 18% straighter
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            than when you started — keep it up.
          </ThemedText>
        </View>
        <View style={styles.heroActions}>
          <Pill
            tone="pink"
            selected
            size="md"
            onPress={() => router.push('/capture-photo' as never)}>
            📷 Take photo
          </Pill>
          <Pill
            tone="navy"
            size="md"
            onPress={() => router.push('/compare-photos' as never)}>
            ↔️ Compare
          </Pill>
        </View>
      </HeroCard>

      <SectionHeading>This month’s analysis</SectionHeading>
      <PhotoAnalysisCard summary={latestPhotoAnalysis} />

      <SectionHeading>Cartoon smile map</SectionHeading>
      <CartoonSmileMap points={cartoonMapPoints} />

      <SectionHeading>Photo log</SectionHeading>
      <CardList>
        {photoLogs.map((log) => (
          <PhotoLogCard key={log.id} log={log} />
        ))}
      </CardList>

      <SectionHeading>Capture checklist</SectionHeading>
      <CardList>
        <Card
          title="Same angle"
          description="Use the same lighting, distance, and smile position for easier comparisons."
          tone="teal"
        />
        <Card
          title="After appointments"
          description="Add a new photo after each adjustment so progress lines up with treatment changes."
          tone="blue"
        />
      </CardList>

      <Pressable
        style={styles.bigCta}
        onPress={() => router.push('/capture-photo' as never)}>
        <ThemedText type="subtitle" style={styles.bigCtaText}>
          📷  Capture today’s photo
        </ThemedText>
        <ThemedText type="small" style={styles.bigCtaHint}>
          Live camera · guided smile · instant analysis
        </ThemedText>
      </Pressable>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroLabel: {
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bigCta: {
    marginTop: Spacing.two,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  bigCtaText: {
    color: '#FFFFFF',
  },
  bigCtaHint: {
    color: 'rgba(255,255,255,0.85)',
  },
});
