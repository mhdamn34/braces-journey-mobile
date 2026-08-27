import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ColorSwatchPicker } from '@/features/capture/components/color-swatch-picker';
import { deletePhotoFile, persistPhotoFile } from '@/features/capture/photo-files';
import { linkableVisitId, suggestedMonthNumber } from '@/features/journey/logic';
import { addEntry, journeyStore } from '@/features/journey/store';
import type { BracketColor } from '@/features/journey/types';
import { profileStore } from '@/features/profile/store';
import type { Visit } from '@/features/visits/types';
import { formatMonthName, todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { darkColors, Radii, Space, Type } from '@/theme/tokens';

// Task 18 replaces this with: import { visitsStore } from '@/features/visits/store';
const visits: Visit[] = [];

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const entries = useStoreValue(journeyStore);
  const profile = useStoreValue(profileStore);
  const [color, setColor] = useState<BracketColor | undefined>(undefined);
  const [note, setNote] = useState('');
  const savedRef = useRef(false);

  const today = todayIso();
  const month = suggestedMonthNumber(entries, profile, today);
  const uri = String(params.uri);

  function save() {
    if (savedRef.current) return;
    savedRef.current = true;
    const id = `${Date.now()}`;
    addEntry({
      id,
      monthNumber: month,
      date: today,
      photo: {
        uri: persistPhotoFile(uri, id),
        width: Number(params.width),
        height: Number(params.height),
        capturedAt: new Date().toISOString(),
      },
      bracketColor: color,
      note: note.trim() || undefined,
      appointmentId: linkableVisitId(entries, visits),
    });
    deletePhotoFile(uri); // best-effort cache cleanup
    router.dismissTo('/');
  }

  function discard() {
    Alert.alert('Discard this photo?', 'You can retake it right away.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          deletePhotoFile(uri);
          router.dismissTo('/');
        },
      },
    ]);
  }

  return (
    <Screen dark>
      <Text style={[Type.display, { color: darkColors.textPrimary }]}>
        Month {month} · {formatMonthName(today)}
      </Text>
      <View style={{ borderRadius: Radii.stage, overflow: 'hidden', position: 'relative' }}>
        <Image source={{ uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" />
      </View>
      <Button label="Retake" variant="secondary" onPress={() => router.back()} />
      <Text style={[Type.label, { color: darkColors.textSecondary }]}>
        Bracket colour this month
      </Text>
      <ColorSwatchPicker value={color} onChange={setColor} />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note — “wire tightened, a bit sore”"
        placeholderTextColor={darkColors.textTertiary}
        style={[
          Type.body,
          {
            color: darkColors.textPrimary,
            borderColor: darkColors.border,
            borderWidth: 1,
            borderRadius: Radii.thumb,
            padding: Space.md,
            backgroundColor: darkColors.surface,
          },
        ]}
      />
      <Button label={`Save Month ${month}`} onPress={save} />
      <Button label="Discard" variant="danger" onPress={discard} />
    </Screen>
  );
}
