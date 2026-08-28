import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SectionVoice } from '@/components/section-voice';
import { profileStore } from '@/features/profile/store';
import type { BracesType } from '@/features/profile/types';
import { isValidIsoDate } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const BRACES_TYPES: { value: BracesType; label: string }[] = [
  { value: 'metal', label: 'Metal' },
  { value: 'ceramic', label: 'Ceramic' },
  { value: 'self-ligating', label: 'Self-ligating' },
  { value: 'lingual', label: 'Lingual' },
  { value: 'aligners', label: 'Clear aligners' },
];

export default function SettingsScreen() {
  const colors = useTheme();
  const profile = useStoreValue(profileStore);
  const [name, setName] = useState(profile.name);
  const [clinicName, setClinicName] = useState(profile.clinicName);
  const [startDate, setStartDate] = useState(profile.treatmentStartDate);
  const [plannedMonths, setPlannedMonths] = useState(profile.plannedMonths);
  const [bracesType, setBracesType] = useState(profile.bracesType);

  const dateValid = isValidIsoDate(startDate);
  const dirty =
    name !== profile.name ||
    clinicName !== profile.clinicName ||
    startDate !== profile.treatmentStartDate ||
    plannedMonths !== profile.plannedMonths ||
    bracesType !== profile.bracesType;

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

  function save() {
    profileStore.update((p) => ({
      ...p,
      name: name.trim(),
      clinicName: clinicName.trim(),
      treatmentStartDate: startDate,
      plannedMonths,
      bracesType,
    }));
    router.back();
  }

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Settings</Text>
      <Text style={[Type.label, { color: colors.textSecondary }]}>Your name</Text>
      <TextInput value={name} onChangeText={setName} placeholderTextColor={colors.textTertiary}
        placeholder="Your name" style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Clinic</Text>
      <TextInput value={clinicName} onChangeText={setClinicName} placeholder="Clinic name"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Braces fitted on</Text>
      <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD"
        autoCapitalize="none" placeholderTextColor={colors.textTertiary}
        style={[...inputStyle, !dateValid && { borderColor: colors.danger }]} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Planned duration</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {[12, 18, 24, 30, 36].map((months) => (
          <Chip key={months} label={`${months} months`} selected={plannedMonths === months}
            onPress={() => setPlannedMonths(months)} />
        ))}
      </View>
      <Text style={[Type.label, { color: colors.textSecondary }]}>Braces type</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {BRACES_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} selected={bracesType === t.value}
            onPress={() => setBracesType(bracesType === t.value ? undefined : t.value)} />
        ))}
      </View>
      <Button label="Save changes" onPress={save} disabled={!dirty || !dateValid} />
      <SectionVoice title="Your photos" />
      <ListRow
        title="Add past photos"
        subtitle="Backfill earlier months from your library"
        onPress={() => router.push('/import-photos')}
      />
    </Screen>
  );
}
