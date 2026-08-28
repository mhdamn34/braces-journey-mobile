import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { monthLabel } from '@/features/journey/logic';
import { entriesWithPhotos, journeyStore } from '@/features/journey/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

export default function CompareScreen() {
  const entries = entriesWithPhotos(useStoreValue(journeyStore));
  const [beforeId, setBeforeId] = useState(entries[0]?.id);
  const [afterId, setAfterId] = useState(entries.at(-1)?.id);
  const [stageWidth, setStageWidth] = useState(0);
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
            aspectRatio: 3 / 4,
            backgroundColor: darkColors.surface,
          }}
        >
          <Image
            source={{ uri: after.photo!.uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
          <Animated.View
            style={[
              { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
              clipStyle,
            ]}
          >
            <Image
              source={{ uri: before.photo!.uri }}
              style={{ width: stageWidth || '100%', height: '100%' }}
              contentFit="cover"
            />
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
        </View>
      </GestureDetector>
      <Text style={[Type.caption, { color: darkColors.textTertiary, textAlign: 'center' }]}>
        Drag anywhere on the photo
      </Text>

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
