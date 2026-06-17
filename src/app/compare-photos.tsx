import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Card,
  CardList,
  MainScreen,
  SectionHeading,
} from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { PhotoComparison } from '@/features/capture/components/photo-comparison';
import { listPhotos } from '@/features/capture/services/photo-storage';
import type { CapturedPhoto } from '@/features/capture/types';
import { useEffect, useState } from 'react';

import { photoLogs } from '@/features/progress-gallery/data/progress-gallery';

export default function ComparePhotosScreen() {
  const params = useLocalSearchParams<{ left?: string; right?: string }>();
  const [captured, setCaptured] = useState<CapturedPhoto[]>([]);

  useEffect(() => {
    listPhotos().then(setCaptured).catch(() => setCaptured([]));
  }, []);

  const merged: CapturedPhoto[] =
    captured.length > 0
      ? captured
      : (photoLogs as unknown as CapturedPhoto[]);

  const left = pick(merged, params.left) ?? merged[0];
  const right = pick(merged, params.right) ?? merged[1] ?? merged[0];

  return (
    <MainScreen
      title="Compare progress"
      subtitle="See how your smile has changed over time.">
      {left && right ? (
        <PhotoComparison before={left} after={right} />
      ) : (
        <Card
          title="Capture two photos first"
          description="Once you've taken a few monthly photos they'll show up here side-by-side."
          tone="blue"
        />
      )}

      <SectionHeading>Available photos</SectionHeading>
      <CardList>
        {merged.length === 0 && (
          <Card
            title="No photos yet"
            description="Take your first progress photo from the camera shortcut."
            tone="teal"
          />
        )}
        {merged.map((photo) => (
          <Card
            key={photo.id}
            title={formatLabel(photo.capturedAt)}
            description={`Score ${photo.score}%`}
            tone={photo.id === left?.id ? 'blue' : 'teal'}
          />
        ))}
      </CardList>

      <View style={styles.footer}>
        <ThemedText type="caption" themeColor="textSecondary">
          Tip: capture a new photo each month to build a stronger comparison.
        </ThemedText>
      </View>
    </MainScreen>
  );
}

function pick(list: CapturedPhoto[], id?: string) {
  if (!id) return undefined;
  return list.find((p) => p.id === id);
}

function formatLabel(iso: string) {
  if (!iso) return 'Photo';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 4,
  },
});
