import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AnchorEditor } from '@/features/capture/alignment/components/anchor-editor';
import { assessAlignment } from '@/features/capture/alignment/quality';
import type { FaceAlignment } from '@/features/capture/alignment/types';
import { journeyStore, setEntryAlignment } from '@/features/journey/store';
import { useStoreValue } from '@/lib/store/use-store-value';
import { useAsyncAction } from '@/lib/use-async-action';
import { darkColors, Type } from '@/theme/tokens';

export default function AlignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useStoreValue(journeyStore).find((e) => e.id === String(id));
  const [draft, setDraft] = useState<FaceAlignment | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { run, pending, error } = useAsyncAction(async (alignment: FaceAlignment) => {
    await setEntryAlignment(String(id), alignment);
    router.back();
  });

  const verdict = draft ? assessAlignment(draft) : null;

  if (!entry?.photo) {
    return (
      <Screen dark>
        <EmptyState voice="Nothing to align" body="This month has no photo yet.">
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen dark>
      <Text style={[Type.display, { color: darkColors.textPrimary }]}>Align this photo</Text>
      <Text style={[Type.caption, { color: darkColors.textTertiary }]}>
        Four taps let every month be compared on the same footing.
      </Text>
      <AnchorEditor key={attempt} uri={entry.photo.uri} onComplete={setDraft} />
      {verdict?.message ? (
        <Text style={[Type.caption, { color: darkColors.danger }]}>{verdict.message}</Text>
      ) : null}
      {error ? <Text style={[Type.caption, { color: darkColors.danger }]}>{error}</Text> : null}
      {draft ? (
        <>
          <Button
            label={pending ? 'Saving…' : 'Save alignment'}
            onPress={() => void run(draft)}
            disabled={pending}
          />
          <Button
            label="Start over"
            variant="secondary"
            disabled={pending}
            onPress={() => {
              setDraft(null);
              setAttempt((n) => n + 1);
            }}
          />
        </>
      ) : null}
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
