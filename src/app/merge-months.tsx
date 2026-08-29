import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { createEntry } from '@/features/journey/store';
import {
  captureLocalSnapshot,
  fetchServerMonths,
  markMigrationCompleted,
} from '@/features/migration/engine';
import { refreshAllApiStores } from '@/lib/store/create-api-store';
import { useAsyncAction } from '@/lib/use-async-action';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MergeMonthsScreen() {
  const colors = useTheme();
  // Captured once, before any refresh — this is the device's v3 data.
  const snapshot = useMemo(() => captureLocalSnapshot(), []);
  const [serverMonths, setServerMonths] = useState<Set<number> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(snapshot.entries.map((e) => e.id)),
  );

  useEffect(() => {
    fetchServerMonths()
      .then(setServerMonths)
      .catch(() => setServerMonths(new Set()));
  }, []);

  const localOnlyEntries = useMemo(
    () =>
      serverMonths === null
        ? []
        : snapshot.entries.filter((e) => !serverMonths.has(e.monthNumber)),
    [snapshot.entries, serverMonths],
  );

  const finishAction = useAsyncAction(async (upload: boolean) => {
    if (upload) {
      for (const entry of localOnlyEntries) {
        if (!selected.has(entry.id)) continue;
        await createEntry({
          monthNumber: entry.monthNumber,
          date: entry.date,
          photoUri: entry.photo?.uri,
          bracketColor: entry.bracketColor,
          note: entry.note,
          // visit links are not merged — visits stay server-authoritative
        });
      }
    }
    markMigrationCompleted();
    await refreshAllApiStores();
    router.replace('/');
  });

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = localOnlyEntries.filter((e) => selected.has(e.id)).length;

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Months on this phone</Text>
      {serverMonths === null ? null : (
        <>
          <Text style={[Type.body, { color: colors.textSecondary }]}>
            Your account already has a journey. These months exist only on this phone — choose
            which to add to your account. Visits and payments follow your account.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
            {localOnlyEntries.map((entry) => (
              <Chip
                key={entry.id}
                label={`Month ${entry.monthNumber}`}
                selected={selected.has(entry.id)}
                onPress={() => toggle(entry.id)}
              />
            ))}
          </View>
          {finishAction.error ? (
            <Text style={[Type.caption, { color: colors.danger }]}>{finishAction.error}</Text>
          ) : null}
          <Button
            label={finishAction.pending ? 'Adding…' : `Add ${selectedCount} to my account`}
            onPress={() => void finishAction.run(true)}
            disabled={finishAction.pending || selectedCount === 0}
          />
          <Button
            label="Skip — use my account as is"
            variant="secondary"
            disabled={finishAction.pending}
            onPress={() => void finishAction.run(false)}
          />
        </>
      )}
    </Screen>
  );
}
