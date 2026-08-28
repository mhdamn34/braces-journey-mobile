import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { Symbol } from '@/components/symbol';
import { GhostOverlay } from '@/features/capture/components/ghost-overlay';
import { monthLabel, suggestedMonthNumber } from '@/features/journey/logic';
import { entriesWithPhotos, journeyStore } from '@/features/journey/store';
import { profileStore } from '@/features/profile/store';
import { todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [ghostVisible, setGhostVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const entries = useStoreValue(journeyStore);
  const profile = useStoreValue(profileStore);
  const previous = entriesWithPhotos(entries).at(-1);
  const nextMonth = suggestedMonthNumber(entries, profile, todayIso());

  if (!permission) return <Screen dark scroll={false}>{null}</Screen>;

  if (!permission.granted) {
    return (
      <Screen dark scroll={false}>
        <EmptyState
          voice="The camera makes the journey"
          body="BracesJourney needs the camera for your monthly photo. Nothing is recorded — one picture, kept on your device."
        >
          {permission.canAskAgain ? (
            <Button label="Allow camera" onPress={requestPermission} />
          ) : (
            <Button label="Open Settings" onPress={() => Linking.openSettings()} />
          )}
          <Button label="Not now" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  async function capture() {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (photo) {
        router.push({
          pathname: '/review',
          params: { uri: photo.uri, width: String(photo.width), height: String(photo.height) },
        });
      }
    } catch {
      Alert.alert("Couldn't take the photo", 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: darkColors.bg }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mirror={facing === 'front'}
      />
      {previous?.photo ? <GhostOverlay uri={previous.photo.uri} visible={ghostVisible} /> : null}

      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: Space.lg,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Symbol name="xmark.circle.fill" fallback="✕" size={28} tintColor="#FFFFFF" />
          </Pressable>
          <Text
            style={[
              Type.label,
              {
                color: '#FFFFFF',
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: Space.md,
                paddingVertical: Space.xs,
                borderRadius: Radii.pill,
                overflow: 'hidden',
              },
            ]}
          >
            Month {nextMonth}
          </Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        {previous ? (
          <Text
            style={[
              Type.caption,
              { color: darkColors.accent, textAlign: 'center', marginBottom: Space.md },
            ]}
          >
            {ghostVisible
              ? `Line up with ${monthLabel(previous)}'s outline`
              : 'Ghost hidden — same spot, same angle'}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingBottom: Space.xxl,
            paddingHorizontal: Space.xxl,
          }}
        >
          {previous ? (
            <Pressable onPress={() => setGhostVisible((v) => !v)} hitSlop={8}>
              <Symbol
                name={ghostVisible ? 'eye.fill' : 'eye.slash'}
                fallback={ghostVisible ? '◎' : '⊘'}
                size={26}
                tintColor="#FFFFFF"
              />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
          <Pressable
            onPress={capture}
            disabled={busy}
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              backgroundColor: '#FFFFFF',
              borderWidth: 4,
              borderColor: 'rgba(255,255,255,0.4)',
              opacity: busy ? 0.5 : 1,
            }}
          />
          <Pressable
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
            hitSlop={8}
          >
            <Symbol
              name="arrow.triangle.2.circlepath.camera"
              fallback="⟳"
              size={26}
              tintColor="#FFFFFF"
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
