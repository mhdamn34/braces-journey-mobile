import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform, Text, type ColorValue } from 'react-native';

type Props = {
  name: string;
  fallback: string;
  size?: number;
  tintColor: ColorValue;
};

export function Symbol({ name, fallback, size = 20, tintColor }: Props) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name as SFSymbol} size={size} tintColor={tintColor} />;
  }
  return <Text style={{ fontSize: size, color: tintColor }}>{fallback}</Text>;
}
