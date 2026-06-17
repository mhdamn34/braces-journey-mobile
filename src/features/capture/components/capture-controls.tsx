import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';

type CaptureControlsProps = {
  onCapture: () => void;
  onFlip: () => void;
  onClose: () => void;
  isCapturing: boolean;
  isAnalyzing: boolean;
};

export function CaptureControls({
  onCapture,
  onFlip,
  onClose,
  isCapturing,
  isAnalyzing,
}: CaptureControlsProps) {
  const disabled = isAnalyzing;
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel="Close camera"
        onPress={onClose}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
        <ThemedText style={styles.iconGlyph}>✕</ThemedText>
      </Pressable>

      <Pressable
        accessibilityLabel="Capture photo"
        disabled={disabled}
        onPress={onCapture}
        style={({ pressed }) => [
          styles.shutter,
          pressed && !disabled && styles.shutterPressed,
          disabled && styles.shutterDisabled,
        ]}>
        <View
          style={[
            styles.shutterInner,
            isAnalyzing && styles.shutterInnerAnalyzing,
          ]}
        />
      </Pressable>

      <Pressable
        accessibilityLabel="Flip camera"
        onPress={onFlip}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
        <ThemedText style={styles.iconGlyph}>⟳</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  iconGlyph: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    transform: [{ scale: 0.96 }],
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  shutterInnerAnalyzing: {
    backgroundColor: BrandColors.teal,
  },
});
