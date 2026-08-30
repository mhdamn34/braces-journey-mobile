import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import type { JourneyEntry } from '@/features/journey/types';
import { darkColors, Space, Type } from '@/theme/tokens';

/** Manual alignment stays reachable whatever the detector produced. Detection
 *  can be wrong as easily as absent — only the user can say where their own
 *  eyes are — and tapping anchors marks the photo `manual`, which the server
 *  never overwrites. */
export function AlignmentControls({ entries }: { entries: JourneyEntry[] }) {
  const unique = entries.filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i);
  const detecting = unique.some((e) => !e.alignment && e.alignmentStatus === 'pending');

  return (
    <View style={{ gap: Space.xs, alignItems: 'center' }}>
      {detecting ? (
        <Text style={[Type.caption, { color: darkColors.textTertiary }]}>
          Aligning these photos…
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: Space.sm, justifyContent: 'center' }}>
        {unique.map((entry) => (
          <Chip
            key={entry.id}
            label={`${entry.alignment ? 'Adjust' : 'Align'} M${entry.monthNumber}`}
            onPress={() => router.push({ pathname: '/align/[id]', params: { id: entry.id } })}
          />
        ))}
      </View>
    </View>
  );
}
