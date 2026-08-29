import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { profileStore } from '@/features/profile/store';
import { addVisit } from '@/features/visits/store';
import { isValidIsoDate, isValidTime, todayIso } from '@/lib/dates';
import { useAsyncAction } from '@/lib/use-async-action';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const VISIT_TYPES = ['Adjustment', 'Wire change', 'Check-up', 'Cleaning', 'Emergency'];
const TIME_OPTIONS = ['09:00', '10:30', '14:00', '16:30'];

export default function NewVisitScreen() {
  const colors = useTheme();
  const profile = useStoreValue(profileStore);
  const [title, setTitle] = useState('Adjustment');
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState('10:30');
  const [location, setLocation] = useState(profile.clinicName || 'Clinic');
  const [notes, setNotes] = useState('');

  const valid = title.trim().length > 0 && isValidIsoDate(date) && isValidTime(time);

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

  const { run: saveRun, pending, error } = useAsyncAction(async () => {
    await addVisit({
      title: title.trim(),
      date,
      time,
      location: location.trim() || 'Clinic',
      notes: notes.trim() || undefined,
      status: 'upcoming',
    });
    router.back();
  });

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>New visit</Text>
      <Text style={[Type.label, { color: colors.textSecondary }]}>What kind?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {VISIT_TYPES.map((t) => (
          <Chip key={t} label={t} selected={title === t} onPress={() => setTitle(t)} />
        ))}
      </View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Or type your own"
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Date</Text>
      <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none"
        placeholderTextColor={colors.textTertiary}
        style={[...inputStyle, !isValidIsoDate(date) && { borderColor: colors.danger }]} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Time</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {TIME_OPTIONS.map((t) => (
          <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} />
        ))}
      </View>
      <TextInput value={time} onChangeText={setTime} placeholder="HH:MM" autoCapitalize="none"
        placeholderTextColor={colors.textTertiary}
        style={[...inputStyle, !isValidTime(time) && { borderColor: colors.danger }]} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Where</Text>
      <TextInput value={location} onChangeText={setLocation}
        placeholderTextColor={colors.textTertiary} style={inputStyle} />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="Anything to remember (optional)"
        placeholderTextColor={colors.textTertiary} multiline style={[...inputStyle, { minHeight: 60 }]} />
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label={pending ? 'Saving…' : 'Save visit'} onPress={() => void saveRun()} disabled={!valid || pending} />
    </Screen>
  );
}
