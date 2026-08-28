import { View } from 'react-native';

export function ColorDot({ hex, size = 10 }: { hex: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: hex }}
    />
  );
}
