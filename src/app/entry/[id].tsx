import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { Symbol } from '@/components/symbol';
import { ColorSwatchPicker } from '@/features/capture/components/color-swatch-picker';
import { monthLabel } from '@/features/journey/logic';
import { deleteEntry, journeyStore, updateEntry } from '@/features/journey/store';
import { formatFullDate } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function EntryDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useStoreValue(journeyStore);
  const entry = entries.find((e) => e.id === id);
  const [note, setNote] = useState(entry?.note ?? '');
  const noteRef = useRef(note);
  noteRef.current = note;
  const entryId = entry?.id;
  useEffect(() => {
    if (!entryId) return;
    return () => {
      updateEntry(entryId, { note: noteRef.current.trim() || undefined });
    };
  }, [entryId]);
  const [photoFailed, setPhotoFailed] = useState(false);

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
        onPress: () => {
          deleteEntry(entry!.id);
          router.back();
        },
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
          <Symbol name="photo" fallback="▢" size={28} tintColor={colors.textTertiary} />
          <Text style={[Type.caption, { color: colors.textTertiary }]}>Photo file missing</Text>
        </View>
      ) : null}
      <Text style={[Type.label, { color: colors.textSecondary }]}>Bracket colour</Text>
      <ColorSwatchPicker
        value={entry.bracketColor}
        onChange={(bracketColor) => updateEntry(entry.id, { bracketColor })}
      />
      <Text style={[Type.label, { color: colors.textSecondary }]}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        onEndEditing={() => updateEntry(entry.id, { note: note.trim() || undefined })}
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
      <Button label="Delete month" variant="danger" onPress={remove} />
    </Screen>
  );
}
