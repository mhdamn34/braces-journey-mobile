import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import type { Arch } from '@/features/capture/alignment/types';
import { AlignedPhoto } from '@/features/journey/components/aligned-photo';
import { monthLabel } from '@/features/journey/logic';
import { entriesWithPhotos, journeyStore } from '@/features/journey/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

export default function CompareScreen() {
  const entries = entriesWithPhotos(useStoreValue(journeyStore));
  const [beforeId, setBeforeId] = useState(entries[0]?.id);
  const [afterId, setAfterId] = useState(entries.at(-1)?.id);
  const [stageWidth, setStageWidth] = useState(0);
  const [arch, setArch] = useState<Arch>('upper');
  const divider = useSharedValue(0.5);

  const pan = Gesture.Pan().onUpdate((e) => {
    'worklet';
    if (stageWidth > 0) {
      divider.value = Math.min(0.95, Math.max(0.05, e.x / stageWidth));
    }
  });

  const clipStyle = useAnimatedStyle(() => ({ width: `${divider.value * 100}%` }));
  const handleStyle = useAnimatedStyle(() => ({ left: `${divider.value * 100}%` }));

  if (entries.length < 2) {
    return (
      <Screen dark>
        <EmptyState
          voice="Two photos to compare"
          body="Once you have at least two months, you can slide between them here."
        >
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  const before = entries.find((e) => e.id === beforeId) ?? entries[0];
  const after = entries.find((e) => e.id === afterId) ?? entries[entries.length - 1];

  return (
    <Screen dark>
      <Text style={[Type.display, { color: darkColors.textPrimary }]}>Compare</Text>

      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setStageWidth(e.nativeEvent.layout.width)}
          style={{
            borderRadius: Radii.stage,
            overflow: 'hidden',
            aspectRatio: 4 / 5,
            backgroundColor: darkColors.surface,
          }}
        >
          {stageWidth > 0 ? (
            <>
              <AlignedPhoto entry={after} stageWidth={stageWidth} arch={arch} />
              <Animated.View
                style={[
                  { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
                  clipStyle,
                ]}
              >
                <View style={{ width: stageWidth, height: '100%' }}>
                  <AlignedPhoto entry={before} stageWidth={stageWidth} arch={arch} />
                </View>
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: 2,
                    marginLeft: -1,
                    backgroundColor: '#FFFFFF',
                  },
                  handleStyle,
                ]}
              />
              <Text style={[Type.caption, chipStyle('left')]}>{monthLabel(before)}</Text>
              <Text style={[Type.caption, chipStyle('right')]}>{monthLabel(after)}</Text>
            </>
          ) : null}
        </View>
      </GestureDetector>
      <Text style={[Type.caption, { color: darkColors.textTertiary, textAlign: 'center' }]}>
        Drag anywhere on the photo
      </Text>

      <View style={{ flexDirection: 'row', gap: Space.sm, justifyContent: 'center' }}>
        <Chip label="Upper" selected={arch === 'upper'} onPress={() => setArch('upper')} />
        <Chip label="Lower" selected={arch === 'lower'} onPress={() => setArch('lower')} />
      </View>

      {(() => {
        const unaligned = [before, after].filter((e) => !e.alignment);
        if (unaligned.length === 0) return null;

        // A photo the server is still working on is not a photo that needs taps.
        if (unaligned.every((e) => e.alignmentStatus === 'pending')) {
          return (
            <Text style={[Type.caption, { color: darkColors.textTertiary, textAlign: 'center' }]}>
              Aligning these photos…
            </Text>
          );
        }

        const target = unaligned.find((e) => e.alignmentStatus !== 'pending') ?? unaligned[0];
        return (
          <Button
            label="Not aligned — add anchors"
            variant="secondary"
            onPress={() => router.push({ pathname: '/align/[id]', params: { id: target.id } })}
          />
        );
      })()}

      <Text style={[Type.label, { color: darkColors.textSecondary }]}>Before</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
        {entries.map((e) => (
          <Chip
            key={e.id}
            label={`M${e.monthNumber}`}
            selected={e.id === before.id}
            onPress={() => setBeforeId(e.id)}
          />
        ))}
      </ScrollView>
      <Text style={[Type.label, { color: darkColors.textSecondary }]}>After</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
        {entries.map((e) => (
          <Chip
            key={e.id}
            label={`M${e.monthNumber}`}
            selected={e.id === after.id}
            onPress={() => setAfterId(e.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function chipStyle(side: 'left' | 'right') {
  return {
    position: 'absolute' as const,
    top: Space.md,
    [side]: Space.md,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    borderRadius: Radii.pill,
    overflow: 'hidden' as const,
    fontWeight: '600' as const,
  };
}
