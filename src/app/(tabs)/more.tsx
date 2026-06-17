import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  CardList,
  HeroCard,
  MainScreen,
  Pill,
  SectionHeading,
  StatCard,
  StatGrid,
} from '@/components/main-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { MoreActionGrid } from '@/features/more/components/more-action-grid';
import { ProfileSummaryCard } from '@/features/more/components/profile-summary-card';
import { moreActions, profileSummary } from '@/features/more/data/more';
import {
  getNextAppointment,
  subscribeAppointments,
} from '@/features/appointments/data/appointments';
import { formatAppointmentDate } from '@/features/appointments/utils/format-appointment-date';

/**
 * More tab.
 *
 * Layout:
 *   1. Profile hero (avatar, name, stage, next visit)
 *   2. Stat tiles (months, photos, pain)
 *   3. Shortcut grid
 *   4. Settings list (reminders, storage, etc.)
 *   5. Sign out
 */
export default function MoreScreen() {
  const [nextAppointment, setNextAppointment] = useState(() => getNextAppointment());

  useEffect(() => {
    const unsubscribe = subscribeAppointments(() => {
      setNextAppointment(getNextAppointment());
    });
    return unsubscribe;
  }, []);

  const dynamicProfile = useMemo(() => {
    const nextVisitStr = nextAppointment
      ? `${formatAppointmentDate(nextAppointment.date)} · ${nextAppointment.time}`
      : 'No upcoming visits';
    return {
      ...profileSummary,
      nextVisit: nextVisitStr,
    };
  }, [nextAppointment]);

  return (
    <MainScreen
      title="More"
      subtitle="Profile, reminders, braces colors, storage, and app preferences.">
      <ProfileSummaryCard profile={dynamicProfile} />

      <StatGrid>
        {profileSummary.stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.label === 'Pain' ? 'pink' : 'teal'}
          />
        ))}
      </StatGrid>

      <HeroCard tone="navy">
        <View style={styles.heroTop}>
          <Pill tone="navy" size="sm">
            📅 {dynamicProfile.nextVisit}
          </Pill>
        </View>
        <View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.heroLabel}>
            TREATMENT STAGE
          </ThemedText>
          <ThemedText type="display" style={styles.heroTitle}>
            {profileSummary.treatmentStage}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profileSummary.clinic} · keep going, you’re doing great.
          </ThemedText>
        </View>
      </HeroCard>

      <SectionHeading>Shortcuts</SectionHeading>
      <MoreActionGrid actions={moreActions} />

      <SectionHeading>Reminders</SectionHeading>
      <CardList>
        <Card
          title="Appointment reminders"
          description="Notify 24 hours before each orthodontist visit."
          tone="teal"
        />
        <Card
          title="Monthly progress photo"
          description="Prompt on the first Sunday after an appointment."
          tone="pink"
        />
        <Card
          title="Payment reminders"
          description="Alert 3 days before each due date."
          tone="blue"
        />
      </CardList>

      <SectionHeading>Settings</SectionHeading>
      <CardList>
        <Card
          title="Storage"
          description="Photos are stored locally during development. Cloud sync arrives soon."
          tone="surface"
        />
        <Card
          title="Notifications"
          description="Choose which reminders to receive and when."
          tone="surface"
        />
        <Card
          title="Sign out"
          description="Securely sign out of your BracesJourney account."
          tone="surface"
        />
      </CardList>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    letterSpacing: 1,
  },
  heroTitle: {
    marginTop: 4,
    marginBottom: 4,
  },
});
