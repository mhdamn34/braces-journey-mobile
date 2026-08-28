import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import type { BracesType } from '@/features/profile/types';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  name: string;
  clinicName: string;
  bracesType?: BracesType;
  onChange: (patch: { name?: string; clinicName?: string; bracesType?: BracesType }) => void;
  onNext: () => void;
};

const BRACES_TYPES: { value: BracesType; label: string }[] = [
  { value: 'metal', label: 'Metal' },
  { value: 'ceramic', label: 'Ceramic' },
  { value: 'self-ligating', label: 'Self-ligating' },
  { value: 'lingual', label: 'Lingual' },
  { value: 'aligners', label: 'Clear aligners' },
];

export function DetailsStep({ name, clinicName, bracesType, onChange, onNext }: Props) {
  const colors = useTheme();
  const inputStyle = [
    Type.body,
    {
      color: colors.textPrimary,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: Radii.thumb,
      padding: Space.md,
      backgroundColor: colors.surface,
    },
  ];

  return (
    <View style={{ flex: 1, gap: Space.lg, justifyContent: 'center' }}>
      <Text style={[Type.display, { color: colors.textPrimary }]}>The details</Text>
      <Text style={[Type.body, { color: colors.textSecondary }]}>
        All optional — skip anything you like.
      </Text>
      <TextInput
        value={name}
        onChangeText={(name) => onChange({ name })}
        placeholder="Your name"
        placeholderTextColor={colors.textTertiary}
        style={inputStyle}
      />
      <TextInput
        value={clinicName}
        onChangeText={(clinicName) => onChange({ clinicName })}
        placeholder="Clinic name"
        placeholderTextColor={colors.textTertiary}
        style={inputStyle}
      />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Braces type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {BRACES_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={bracesType === t.value}
            onPress={() => onChange({ bracesType: bracesType === t.value ? undefined : t.value })}
          />
        ))}
      </View>
      <Button label="Continue" onPress={onNext} />
    </View>
  );
}
