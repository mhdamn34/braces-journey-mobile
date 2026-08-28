import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SectionVoice } from '@/components/section-voice';
import { VisitRow } from '@/features/visits/components/visit-row';
import { visitsStore } from '@/features/visits/store';
import { todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function VisitsScreen() {
  const colors = useTheme();
  const visits = useStoreValue(visitsStore);
  const today = todayIso();
  const upcoming = visits.filter((v) => v.status === 'upcoming' && v.date >= today);
  const past = visits.filter((v) => !upcoming.includes(v)).reverse();

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>Visits</Text>
      {visits.length === 0 ? (
        <EmptyState
          voice="No visits yet"
          body="Add your next adjustment so BracesJourney can remind you to capture after it."
        >
          <Button label="Add a visit" onPress={() => router.push('/visits/new')} />
        </EmptyState>
      ) : (
        <>
          <SectionVoice title="Coming up" actionLabel="+ Add" onAction={() => router.push('/visits/new')} />
          <View style={{ gap: Space.sm }}>
            {upcoming.length === 0 ? (
              <Text style={[Type.caption, { color: colors.textTertiary }]}>Nothing scheduled.</Text>
            ) : (
              upcoming.map((v) => (
                <VisitRow
                  key={v.id}
                  visit={v}
                  onPress={() => router.push({ pathname: '/visits/[id]', params: { id: v.id } })}
                />
              ))
            )}
          </View>
          {past.length > 0 ? (
            <>
              <SectionVoice title="Earlier" />
              <View style={{ gap: Space.sm }}>
                {past.map((v) => (
                  <VisitRow
                    key={v.id}
                    visit={v}
                    onPress={() => router.push({ pathname: '/visits/[id]', params: { id: v.id } })}
                  />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
