import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ColorDot } from '@/components/color-dot';
import { Symbol } from '@/components/symbol';
import { monthLabel } from '@/features/journey/logic';
import { entriesWithPhotos, journeyStore } from '@/features/journey/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

const FRAME_MS = 400;

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ startId?: string; autoplay?: string }>();
  const rawEntries = useStoreValue(journeyStore);
  const entries = useMemo(() => entriesWithPhotos(rawEntries), [rawEntries]);
  const startIndex = Math.max(
    0,
    entries.findIndex((e) => e.id === params.startId),
  );
  const [index, setIndex] = useState(params.autoplay ? 0 : startIndex);
  const [playing, setPlaying] = useState(Boolean(params.autoplay));
  const [barWidth, setBarWidth] = useState(1);

  const uris = useMemo(() => entries.map((e) => e.photo!.uri), [entries]);
  useEffect(() => {
    uris.forEach((uri) => Image.prefetch(uri));
  }, [uris]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((current) => (current >= entries.length - 1 ? current : current + 1));
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [playing, entries.length]);

  useEffect(() => {
    if (playing && index >= entries.length - 1) setPlaying(false);
  }, [playing, index, entries.length]);

  const prevIndexRef = useRef(index);
  useEffect(() => {
    if (prevIndexRef.current !== index) {
      prevIndexRef.current = index;
      Haptics.selectionAsync();
    }
  }, [index]);

  function scrubTo(x: number) {
    const ratio = Math.min(1, Math.max(0, x / barWidth));
    setIndex(Math.round(ratio * (entries.length - 1)));
  }

  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(scrubTo)(e.x))
    .onUpdate((e) => runOnJS(scrubTo)(e.x));

  useEffect(() => {
    if (entries.length === 0) router.back();
  }, [entries.length]);
  if (entries.length === 0) return null;

  const entry = entries[Math.min(index, entries.length - 1)];

  function togglePlay() {
    if (index >= entries.length - 1) setIndex(0);
    setPlaying((p) => !p);
  }

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.bg }}>
      <Image
        source={{ uri: entry.photo!.uri }}
        style={{ flex: 1 }}
        contentFit="contain"
        recyclingKey="player"
      />
      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: Space.lg,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Space.sm,
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: Space.md,
              paddingVertical: Space.xs,
              borderRadius: Radii.pill,
            }}
          >
            <Text style={[Type.label, { color: darkColors.textPrimary }]}>{monthLabel(entry)}</Text>
            {entry.bracketColor ? <ColorDot hex={entry.bracketColor.hex} /> : null}
          </View>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Symbol name="xmark.circle.fill" fallback="✕" size={28} tintColor="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>
      <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View style={{ padding: Space.lg, gap: Space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
            <Pressable onPress={togglePlay} hitSlop={8}>
              <Symbol
                name={playing ? 'pause.circle.fill' : 'play.circle.fill'}
                fallback={playing ? '❚❚' : '▶'}
                size={40}
                tintColor={darkColors.accent}
              />
            </Pressable>
            <GestureDetector gesture={pan}>
              <View
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                style={{ flex: 1, height: 44, justifyContent: 'center' }}
              >
                <View style={{ height: 3, backgroundColor: darkColors.border, borderRadius: 2 }} />
                <View
                  style={{
                    position: 'absolute',
                    left: (barWidth - 14) * (entries.length > 1 ? index / (entries.length - 1) : 0),
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: darkColors.textPrimary,
                  }}
                />
              </View>
            </GestureDetector>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {entries.map((e, i) => (
              <Text
                key={e.id}
                style={[
                  Type.micro,
                  { color: i === index ? darkColors.textPrimary : darkColors.textTertiary },
                ]}
              >
                {e.monthNumber}
              </Text>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
