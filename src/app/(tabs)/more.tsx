import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { suggestedMonthNumber } from '@/features/journey/logic';
import { journeyStore } from '@/features/journey/store';
import { profileStore } from '@/features/profile/store';
import { todayIso } from '@/lib/dates';
import { useStoreValue } from '@/lib/store/use-store-value';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MoreScreen() {
  const colors = useTheme();
  const profile = useStoreValue(profileStore);
  const entries = useStoreValue(journeyStore);
  const currentMonth = Math.max(1, suggestedMonthNumber(entries, profile, todayIso()) - 1);

  return (
    <Screen>
      <Text style={[Type.display, { color: colors.textPrimary }]}>
        {profile.name.trim() || 'Your journey'}
      </Text>
      <Text style={[Type.caption, { color: colors.textSecondary }]}>
        {profile.clinicName.trim() ? `${profile.clinicName} · ` : ''}
        Month {currentMonth} of {profile.plannedMonths}
      </Text>
      <View style={{ gap: Space.sm }}>
        <ListRow
          title="Visits"
          subtitle="Appointments and adjustments"
          onPress={() => router.push('/visits')}
        />
        <ListRow
          title="Payments"
          subtitle="Plan total and what you've paid"
          onPress={() => router.push('/payments')}
        />
        <ListRow
          title="Settings"
          subtitle="Your details, dates, past photos"
          onPress={() => router.push('/settings')}
        />
      </View>
    </Screen>
  );
}
