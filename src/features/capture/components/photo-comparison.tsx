import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import {
  BrandColors,
  Radii,
  Shadows,
  Spacing,
  Tints,
} from '@/constants/theme';
import type { CapturedPhoto } from '@/features/capture/types';

type Mode = 'side-by-side' | 'slider';

type PhotoComparisonProps = {
  before: CapturedPhoto;
  after: CapturedPhoto;
};

export function PhotoComparison({ before, after }: PhotoComparisonProps) {
  const [mode, setMode] = useState<Mode>('side-by-side');

  return (
    <View style={styles.wrap}>
      <View style={styles.toggleRow}>
        <ToggleButton
          label="Side by side"
          selected={mode === 'side-by-side'}
          onPress={() => setMode('side-by-side')}
        />
        <ToggleButton
          label="Slider"
          selected={mode === 'slider'}
          onPress={() => setMode('slider')}
        />
      </View>

      {mode === 'side-by-side' ? (
        <View style={styles.row}>
          <CompareTile photo={before} label="Before" tone="blue" />
          <CompareTile photo={after} label="After" tone="teal" />
        </View>
      ) : (
        <SliderCompare before={before} after={after} />
      )}
    </View>
  );
}

function ToggleButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = Tints[selected ? 'teal' : 'navy'];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: selected ? BrandColors.teal : tint.soft,
          borderColor: selected ? BrandColors.teal : tint.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{ color: selected ? '#FFFFFF' : BrandColors.teal }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CompareTile({
  photo,
  label,
  tone,
}: {
  photo: CapturedPhoto;
  label: string;
  tone: 'teal' | 'blue';
}) {
  const tint = Tints[tone];
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: tint.soft, borderColor: tint.line },
        Shadows.soft,
      ]}>
      <View style={styles.tileLabelRow}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.kicker}>
          {label.toUpperCase()}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: BrandColors[tone] }}>
          {photo.score}%
        </ThemedText>
      </View>
      <View style={styles.tileImageWrap}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.tileImage}
          contentFit="cover"
          transition={200}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDate(photo.capturedAt)}
      </ThemedText>
    </View>
  );
}

/**
 * A swipe-slider comparison view. Two photos stacked with a
 * draggable vertical divider that reveals more of one or the other.
 * The "handle" can be dragged horizontally — for simplicity in the
 * MVP we just expose a set of preset positions plus a tap-to-jump.
 */
function SliderCompare({
  before,
  after,
}: {
  before: CapturedPhoto;
  after: CapturedPhoto;
}) {
  const [position, setPosition] = useState(0.5); // 0 = all before, 1 = all after

  return (
    <View style={[styles.slider, Shadows.soft]}>
      <Image
        source={{ uri: before.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />
      <View
        style={[
          styles.sliderTop,
          { width: `${position * 100}%` },
        ]}>
        <Image
          source={{ uri: after.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Divider line */}
      <View
        pointerEvents="none"
        style={[
          styles.divider,
          { left: `${position * 100}%` },
        ]}
      />

      {/* Tap zones to move the slider */}
      <View style={styles.tapRow}>
        <Pressable
          onPress={() => setPosition(clamp(position - 0.1))}
          style={styles.tapZone}>
          <ThemedText style={styles.tapLabel}>‹ Before</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setPosition(clamp(position + 0.1))}
          style={styles.tapZone}>
          <ThemedText style={styles.tapLabel}>After ›</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function clamp(v: number) {
  return Math.max(0, Math.min(1, v));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggle: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    padding: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  tileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    letterSpacing: 1,
  },
  tileImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radii.sm,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  slider: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  sliderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: '#FFFFFF',
  },
  tapRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  tapZone: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radii.pill,
  },
  tapLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
