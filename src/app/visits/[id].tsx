import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { suggestedMonthNumber } from '@/features/journey/logic';
import { journeyStore } from '@/features/journey/store';
import { profileStore } from '@/features/profile/store';
import type { VisitStatus } from '@/features/visits/types';
import { deleteVisit, updateVisit, visitsStore } from '@/features/visits/store';
import { formatFullDate, todayIso } from '@/lib/dates';
import { useAsyncAction } from '@/lib/use-async-action';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STATUSES: { value: VisitStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
];

export default function VisitDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visits = useStoreValue(visitsStore);
  const entries = useStoreValue(journeyStore);
  const profile = useStoreValue(profileStore);
  const visit = visits.find((v) => v.id === id);

  const {
    run: statusRun,
    pending: statusPending,
    error: statusError,
  } = useAsyncAction(async (status: VisitStatus) => {
    if (!visit) return;
    await updateVisit(visit.id, { status });
    if (status === 'completed') {
      const month = suggestedMonthNumber(entries, profile, todayIso());
      Alert.alert('Changed brackets?', `Capture Month ${month} while it's fresh.`, [
        { text: 'Later', style: 'cancel' },
        { text: `Capture Month ${month}`, onPress: () => router.push('/camera') },
      ]);
    }
  });

  const {
    run: deleteRun,
    pending: deletePending,
    error: deleteError,
  } = useAsyncAction(async () => {
    if (!visit) return;
    await deleteVisit(visit.id);
    router.back();
  });

  if (!visit) {
    return (
      <Screen>
        <EmptyState voice="Visit not found" body="It may have been deleted.">
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  function remove() {
    Alert.alert('Delete this visit?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteRun(),
      },
    ]);
  }

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>{visit.title}</Text>
      <Text style={[Type.body, { color: colors.textSecondary }]}>
        {formatFullDate(visit.date)} · {visit.time}
      </Text>
      <Text style={[Type.caption, { color: colors.textTertiary }]}>{visit.location}</Text>
      <View style={{ flexDirection: 'row', gap: Space.sm }}>
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            selected={visit.status === s.value}
            onPress={statusPending ? undefined : () => void statusRun(s.value)}
          />
        ))}
      </View>
      {statusError ? <Text style={[Type.caption, { color: colors.danger }]}>{statusError}</Text> : null}
      {visit.notes ? (
        <Card>
          <Text style={[Type.label, { color: colors.textPrimary }]}>Notes</Text>
          <Text style={[Type.body, { color: colors.textSecondary }]}>{visit.notes}</Text>
        </Card>
      ) : null}
      {deleteError ? <Text style={[Type.caption, { color: colors.danger }]}>{deleteError}</Text> : null}
      <Button
        label={deletePending ? 'Deleting…' : 'Delete visit'}
        variant="danger"
        onPress={remove}
        disabled={deletePending}
      />
    </Screen>
  );
}
