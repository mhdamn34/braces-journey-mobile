import { Pressable, View } from 'react-native';

import { BRACKET_COLORS } from '@/features/journey/bracket-colors';
import type { BracketColor } from '@/features/journey/types';
import { Space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  value?: BracketColor;
  onChange: (color: BracketColor | undefined) => void;
};

export function ColorSwatchPicker({ value, onChange }: Props) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.md }}>
      {BRACKET_COLORS.map((color) => {
        const selected = value?.name === color.name;
        return (
          <Pressable
            key={color.name}
            accessibilityLabel={`Bracket colour ${color.name}`}
            onPress={() => onChange(selected ? undefined : color)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: color.hex,
              borderWidth: selected ? 3 : 1,
              borderColor: selected ? colors.accent : colors.border,
            }}
          />
        );
      })}
    </View>
  );
}
