import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { ColorDot } from '@/components/color-dot';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionVoice } from '@/components/section-voice';
import { DuePrompt } from '@/features/journey/components/due-prompt';
import { EntryRow } from '@/features/journey/components/entry-row';
import { Filmstrip } from '@/features/journey/components/filmstrip';
import { PhotoStage } from '@/features/journey/components/photo-stage';
import { dueState, suggestedMonthNumber } from '@/features/journey/logic';
import { entriesWithPhotos, journeyStore } from '@/features/journey/store';
import { profileStore } from '@/features/profile/store';
import { visitsStore } from '@/features/visits/store';
import { formatMonthYear, todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function JourneyScreen() {
  const colors = useTheme();
  const allEntries = useStoreValue(journeyStore);
  const profile = useStoreValue(profileStore);
  const visits = useStoreValue(visitsStore);
  const entries = entriesWithPhotos(allEntries);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const lastSeenLatestIdRef = useRef<string | null>(null);
  // Follow the latest entry when a new month arrives or the selection vanishes.
  useFocusEffect(
    useCallback(() => {
      const latest = entries.at(-1);
      if (!latest) return;
      const latestIsNew = lastSeenLatestIdRef.current !== latest.id;
      lastSeenLatestIdRef.current = latest.id;
      if (latestIsNew || !entries.some((e) => e.id === selectedId)) {
        setSelectedId(latest.id);
      }
    }, [entries, selectedId]),
  );

  const today = todayIso();
  const state = dueState(allEntries, visits, today);
  const nextMonth = suggestedMonthNumber(allEntries, profile, today);

  if (entries.length === 0) {
    return (
      <Screen>
        <Text style={[Type.display, { color: colors.textPrimary }]}>Your journey</Text>
        <EmptyState
          voice="It starts with one photo"
          body="After every bracket change, capture your smile from the same spot. Month by month, you'll watch your teeth move."
        >
          <Button label={`Capture Month ${nextMonth}`} onPress={() => router.push('/camera')} />
          <Button
            label="Add past photos"
            variant="secondary"
            onPress={() => router.push('/import-photos')}
          />
        </EmptyState>
      </Screen>
    );
  }

  const selected = entries.find((e) => e.id === selectedId) ?? entries[entries.length - 1];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={[Type.display, { color: colors.textPrimary }]}>
            Month {selected.monthNumber}
          </Text>
          <Text style={[Type.caption, { color: colors.textSecondary }]}>
            of {profile.plannedMonths} · {formatMonthYear(selected.date)}
          </Text>
        </View>
        {selected.bracketColor ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Space.xs }}>
            <ColorDot hex={selected.bracketColor.hex} />
            <Text style={[Type.label, { color: colors.textSecondary }]}>
              {selected.bracketColor.name}
            </Text>
          </View>
        ) : null}
      </View>

      <PhotoStage
        entry={selected}
        onPress={() => router.push({ pathname: '/player', params: { startId: selected.id } })}
      />

      <Filmstrip
        entries={entries}
        selectedId={selected.id}
        onSelect={setSelectedId}
        onPlay={() => router.push({ pathname: '/player', params: { autoplay: '1' } })}
      />

      {state === 'due' ? (
        <DuePrompt monthNumber={nextMonth} onPress={() => router.push('/camera')} />
      ) : null}

      <SectionVoice
        title="The story so far"
        actionLabel={entries.length >= 2 ? 'Compare' : undefined}
        onAction={entries.length >= 2 ? () => router.push('/compare') : undefined}
      />
      <View style={{ gap: Space.sm }}>
        {[...entries].reverse().map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
          />
        ))}
      </View>
      {entries.length < 3 ? (
        <Chip label="+ Add past photos" onPress={() => router.push('/import-photos')} />
      ) : null}
    </Screen>
  );
}
