import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { Symbol } from '@/components/symbol';
import { ColorSwatchPicker } from '@/features/capture/components/color-swatch-picker';
import { persistPhotoFile } from '@/features/capture/photo-files';
import { suggestImportMonths } from '@/features/journey/logic';
import { addEntry, journeyStore } from '@/features/journey/store';
import type { BracketColor } from '@/features/journey/types';
import { profileStore } from '@/features/profile/store';
import { addMonthsIso, parseExifDate } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Radii, Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Row = {
  uri: string;
  width: number;
  height: number;
  creationDateIso?: string;
  month: number;
  color?: BracketColor;
  note: string;
};

export default function ImportPhotosScreen() {
  const colors = useTheme();
  const entries = useStoreValue(journeyStore);
  const profile = useStoreValue(profileStore);
  const [rows, setRows] = useState<Row[]>([]);
  const takenMonths = new Set(entries.map((e) => e.monthNumber));

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 24,
      exif: true,
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;
    const candidates = result.assets
      .map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        creationDateIso: parseExifDate(
          (asset.exif?.DateTimeOriginal ?? asset.exif?.DateTime) as string | undefined,
        ),
      }))
      .sort((a, b) => (a.creationDateIso ?? '9999').localeCompare(b.creationDateIso ?? '9999'));
    const months = suggestImportMonths(candidates, profile, [...takenMonths]);
    setRows(candidates.map((c, i) => ({ ...c, month: months[i], note: '' })));
  }

  function shiftMonth(index: number, direction: 1 | -1) {
    setRows((current) => {
      const used = new Set([...takenMonths, ...current.map((r) => r.month)]);
      let next = current[index].month + direction;
      while (next >= 1 && used.has(next)) next += direction;
      if (next < 1) return current;
      return current.map((r, i) => (i === index ? { ...r, month: next } : r));
    });
  }

  function confirm() {
    for (const row of rows) {
      const id = `${Date.now()}-${row.month}`;
      const date = row.creationDateIso ?? addMonthsIso(profile.treatmentStartDate, row.month - 1);
      addEntry({
        id,
        monthNumber: row.month,
        date,
        photo: {
          uri: persistPhotoFile(row.uri, id),
          width: row.width,
          height: row.height,
          capturedAt: `${date}T12:00:00.000Z`,
        },
        bracketColor: row.color,
        note: row.note.trim() || undefined,
      });
    }
    router.back();
  }

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Bring your history</Text>
      {rows.length === 0 ? (
        <EmptyState
          voice="Photos from past months?"
          body="Pick them from your library — each becomes a month in your journey. You can adjust the month, colour, and notes before adding."
        >
          <Button label="Choose photos" onPress={pickPhotos} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      ) : (
        <>
          {rows.map((row, index) => (
            <Card key={row.uri}>
              <View style={{ flexDirection: 'row', gap: Space.md, alignItems: 'center' }}>
                <Image
                  source={{ uri: row.uri }}
                  style={{ width: 56, height: 56, borderRadius: Radii.thumb }}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.md }}>
                    <Pressable onPress={() => shiftMonth(index, -1)} hitSlop={8}>
                      <Symbol name="minus.circle" fallback="−" tintColor={colors.accent} />
                    </Pressable>
                    <Text style={[Type.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                      Month {row.month}
                    </Text>
                    <Pressable onPress={() => shiftMonth(index, 1)} hitSlop={8}>
                      <Symbol name="plus.circle" fallback="+" tintColor={colors.accent} />
                    </Pressable>
                  </View>
                  <Text style={[Type.caption, { color: colors.textTertiary }]}>
                    {row.creationDateIso ?? 'no photo date — set the month yourself'}
                  </Text>
                </View>
              </View>
              <ColorSwatchPicker
                value={row.color}
                onChange={(color) =>
                  setRows((current) => current.map((r, i) => (i === index ? { ...r, color } : r)))
                }
              />
              <TextInput
                value={row.note}
                onChangeText={(note) =>
                  setRows((current) => current.map((r, i) => (i === index ? { ...r, note } : r)))
                }
                placeholder="Note for this month (optional)"
                placeholderTextColor={colors.textTertiary}
                style={[
                  Type.body,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: Radii.thumb,
                    padding: Space.sm,
                  },
                ]}
              />
            </Card>
          ))}
          <Button
            label={`Add ${rows.length} ${rows.length === 1 ? 'month' : 'months'}`}
            onPress={confirm}
          />
          <Button label="Start over" variant="secondary" onPress={() => setRows([])} />
        </>
      )}
    </Screen>
  );
}
