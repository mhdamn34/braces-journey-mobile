import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { CaptureControls } from '@/features/capture/components/capture-controls';
import { SmileGuideOverlay } from '@/features/capture/components/smile-guide-overlay';
import { verifyPhoto } from '@/features/capture/services/photo-verification';

/**
 * Live camera capture screen.
 *
 * Flow:
 *   1. Ask for camera permission.
 *   2. Show the live preview with a "smile guide" overlay.
 *   3. User taps the shutter button -> snap a photo.
 *   4. The captured file is passed to `verifyPhoto` (mock or real).
 *   5. We push the result to `/photo-review` so the user can
 *      retake or save the photo.
 */
export default function CapturePhotoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const [guideIntensity, setGuideIntensity] =
    useState<'soft' | 'active' | 'success'>('active');
  const cameraRef = useRef<CameraView | null>(null);

  // Pulse the guide briefly when the screen first appears.
  useEffect(() => {
    setGuideIntensity('soft');
    const t = setTimeout(() => setGuideIntensity('active'), 400);
    return () => clearTimeout(t);
  }, []);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ThemedText>Preparing camera…</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <ThemedText type="subtitle" style={styles.permissionTitle}>
            Camera access needed
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.permissionBody}>
            We use the front camera to capture your smile so the photo lines up
            with your previous logs. Photos stay on your device.
          </ThemedText>
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.permissionBtn,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.permissionBtnText}>Allow camera</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.permissionCancel}>
            <ThemedText type="small" themeColor="textSecondary">
              Not now
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setGuideIntensity('success');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });
      if (!photo) throw new Error('No photo');

      const result = await verifyPhoto({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      });

// `as never` to bypass typed-routes until the new file is picked up by the codegen step.
      router.replace({
        pathname: '/photo-review' as never,
        params: {
          uri: photo.uri,
          width: String(photo.width),
          height: String(photo.height),
          score: String(result.score),
          isAcceptable: result.isAcceptable ? '1' : '0',
          issues: JSON.stringify(result.issues),
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('capture failed', err);
      setGuideIntensity('active');
    } finally {
      setIsCapturing(false);
    }
  }

  function handleFlip() {
    Haptics.selectionAsync();
    setFacing((f) => (f === 'front' ? 'back' : 'front'));
  }

  return (
    <View style={styles.cameraWrap}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        ratio="4:3"
      />

      <View pointerEvents="none" style={styles.guideWrap}>
        <SmileGuideOverlay intensity={guideIntensity} />
      </View>

      {/* Top hint */}
      <View style={styles.topHintWrap} pointerEvents="none">
        <View style={styles.topHint}>
          <ThemedText style={styles.topHintText}>
            Fit your smile inside the teal arc
          </ThemedText>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <CaptureControls
          onCapture={handleCapture}
          onFlip={handleFlip}
          onClose={() => router.back()}
          isCapturing={isCapturing}
          isAnalyzing={isCapturing}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  cameraWrap: {
    flex: 1,
    backgroundColor: '#000000',
  },
  guideWrap: {
    ...StyleSheet.absoluteFill,
  },
  topHintWrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topHint: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topHintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
  },
  permissionCard: {
    backgroundColor: BrandColors.teal,
    padding: Spacing.four,
    borderRadius: Radii.lg,
    gap: Spacing.three,
    maxWidth: 360,
  },
  permissionTitle: {
    color: '#FFFFFF',
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.85)',
  },
  permissionBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.three,
    borderRadius: Radii.pill,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  permissionBtnText: {
    color: BrandColors.teal,
    fontWeight: '700',
    fontSize: 15,
  },
  permissionCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
