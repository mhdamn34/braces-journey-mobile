import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

type Props = { uri: string; visible: boolean };

/** Last month's photo at 45% opacity over the camera preview so the user can
 * line up the same angle. pointerEvents none — never blocks camera controls. */
export function GhostOverlay({ uri, visible }: Props) {
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{ uri }} style={{ flex: 1, opacity: 0.45 }} contentFit="cover" />
    </View>
  );
}
