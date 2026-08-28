import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Symbol } from '@/components/symbol';
import { dueState, monthLabel, suggestedMonthNumber } from '@/features/journey/logic';
import { entriesWithPhotos, journeyStore } from '@/features/journey/store';
import { profileStore } from '@/features/profile/store';
import { visitsStore } from '@/features/visits/store';
import { formatShortDate, todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const CHECKLIST = [
  'Same spot and lighting as last month',
  'Line the ghost up before you snap',
  'Big smile, teeth together',
];

export default function CaptureScreen() {
  const colors = useTheme();
  const entries = useStoreValue(journeyStore);
  const profile = useStoreValue(profileStore);
  const visits = useStoreValue(visitsStore);

  const today = todayIso();
  const state = dueState(entries, visits, today);
  const nextMonth = suggestedMonthNumber(entries, profile, today);
  const latest = entriesWithPhotos(entries).at(-1);

  const subtitle =
    state === 'first'
      ? 'Not started — your journey begins with one photo.'
      : state === 'due'
        ? latest
          ? `It's been a while since ${monthLabel(latest)} — time for the next one.`
          : "Time for this month's photo."
        : latest
          ? `${monthLabel(latest)} captured on ${formatShortDate(latest.date)}.`
          : '';

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>
        {state === 'done' ? `Month ${latest?.monthNumber} captured` : `Month ${nextMonth}`}
        {state === 'due' ? ' · due' : ''}
      </Text>
      <Text style={[Type.body, { color: colors.textSecondary }]}>{subtitle}</Text>

      <Card>
        <Text style={[Type.label, { color: colors.textPrimary }]}>This month&apos;s photo</Text>
        {state === 'done' && latest?.photo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
            <Image
              source={{ uri: latest.photo.uri }}
              style={{ width: 56, height: 56, borderRadius: Radii.thumb }}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={[Type.caption, { color: colors.textSecondary }]}>
                Done. Next one after your next adjustment.
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[Type.caption, { color: colors.textSecondary }]}>
            Best within a few days of your adjustment.
          </Text>
        )}
        {state === 'done' && latest ? (
          <Button
            label="View this month"
            variant="secondary"
            onPress={() => router.push({ pathname: '/entry/[id]', params: { id: latest.id } })}
          />
        ) : (
          <Button label="Open camera" onPress={() => router.push('/camera')} />
        )}
      </Card>

      <Card>
        <Text style={[Type.label, { color: colors.textPrimary }]}>Quick checklist</Text>
        {CHECKLIST.map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: Space.sm, alignItems: 'center' }}>
            <Symbol name="checkmark.circle" fallback="✓" size={16} tintColor={colors.accent} />
            <Text style={[Type.caption, { color: colors.textSecondary, flex: 1 }]}>{item}</Text>
          </View>
        ))}
      </Card>

      {state === 'done' ? (
        <Button label="Capture again anyway" variant="secondary" onPress={() => router.push('/camera')} />
      ) : null}
    </Screen>
  );
}
