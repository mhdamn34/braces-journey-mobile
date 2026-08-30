import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/icon';
import { ColorSwatchPicker } from '@/features/capture/components/color-swatch-picker';
import { monthLabel } from '@/features/journey/logic';
import { deleteEntry, journeyStore, updateEntry } from '@/features/journey/store';
import type { BracketColor } from '@/features/journey/types';
import { formatFullDate } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { useAsyncAction } from '@/lib/use-async-action';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function EntryDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useStoreValue(journeyStore);
  const entry = entries.find((e) => e.id === id);
  const [note, setNote] = useState(entry?.note ?? '');
  const [photoFailed, setPhotoFailed] = useState(false);

  // Address the entry by its route param, never `entry!.id`. Deleting removes
  // the entry from the store, so this screen re-renders with `entry` undefined
  // — and React Compiler hoists property reads from these callbacks into
  // render-time dependency checks, which run BEFORE the `if (!entry)` return
  // below. `entry!.id` therefore threw on every successful delete.
  const noteAction = useAsyncAction(async () => {
    await updateEntry(id, { note: note.trim() || undefined });
  });
  const colorAction = useAsyncAction(async (bracketColor?: BracketColor) => {
    await updateEntry(id, { bracketColor });
  });
  const deleteAction = useAsyncAction(async () => {
    await deleteEntry(id);
    router.back();
  });

  if (!entry) {
    return (
      <Screen>
        <EmptyState voice="This month is gone" body="The entry was deleted.">
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  function remove() {
    Alert.alert('Delete this month?', 'The photo is removed from your device too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteAction.run(),
      },
    ]);
  }

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>{monthLabel(entry)}</Text>
      <Text style={[Type.caption, { color: colors.textSecondary }]}>
        {formatFullDate(entry.date)}
      </Text>
      {entry.photo && !photoFailed ? (
        <Image
          source={{ uri: entry.photo.uri }}
          style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: Radii.stage }}
          contentFit="cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : entry.photo && photoFailed ? (
        <View
          style={{
            width: '100%',
            aspectRatio: 3 / 4,
            borderRadius: Radii.stage,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            gap: Space.sm,
          }}
        >
          <Icon name="photo" fallback="▢" size={28} tintColor={colors.textTertiary} />
          <Text style={[Type.caption, { color: colors.textTertiary }]}>Photo file missing</Text>
        </View>
      ) : null}
      <Text style={[Type.label, { color: colors.textSecondary }]}>Bracket colour</Text>
      <ColorSwatchPicker
        value={entry.bracketColor}
        onChange={(bracketColor) => void colorAction.run(bracketColor)}
      />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What happened this month?"
        placeholderTextColor={colors.textTertiary}
        multiline
        style={[
          Type.body,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: Radii.thumb,
            padding: Space.md,
            minHeight: 72,
            backgroundColor: colors.surface,
          },
        ]}
      />
      {note.trim() !== (entry.note ?? '') ? (
        <Button
          label={noteAction.pending ? 'Saving…' : 'Save note'}
          onPress={() => void noteAction.run()}
          disabled={noteAction.pending}
        />
      ) : null}
      {noteAction.error ?? colorAction.error ?? deleteAction.error ? (
        <Text style={[Type.caption, { color: colors.danger }]}>
          {noteAction.error ?? colorAction.error ?? deleteAction.error}
        </Text>
      ) : null}
      <Button label="Delete month" variant="danger" onPress={remove} />
    </Screen>
  );
}
