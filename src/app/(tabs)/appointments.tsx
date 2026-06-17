import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CardList,
  HeroCard,
  MainScreen,
  Pill,
  SectionHeading,
} from '@/components/main-screen';
import {
  BrandColors,
  Radii,
  Shadows,
  Spacing,
} from '@/constants/theme';
import { AppointmentCard } from '@/features/appointments/components/appointment-card';
import {
  listAppointments,
  subscribeAppointments,
} from '@/features/appointments/data/appointments';
import type { Appointment } from '@/features/appointments/types';
import {
  formatAppointmentDate,
  relativeDayLabel,
} from '@/features/appointments/utils/format-appointment-date';

/**
 * /appointments (Visits tab)
 *
 * The simplest possible list experience:
 *   • Hero card with the next upcoming visit (tap → /appointments/[id])
 *   • Full chronological list (Upcoming → Past)
 *   • Floating "+ New appointment" CTA at the bottom
 *
 * No more inline date strip, no more time picker, no more selection
 * confirmation.  Those interactions live in their own routes now:
 *   /appointments/new  → wizard for a brand-new appointment
 *   /appointments/[id] → detail / edit / status / delete
 */
export default function AppointmentsScreen() {
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    listAppointments(),
  );

  useEffect(() => {
    const unsubscribe = subscribeAppointments(() => {
      setAppointments(listAppointments());
    });
    return unsubscribe;
  }, []);

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === 'Upcoming'),
    [appointments],
  );

  const next = useMemo(() => upcoming[0], [upcoming]);

  const ordered = useMemo(() => {
    // Newest date first (most recent upcoming on top, then by date).
    return [...appointments].sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments]);

  const handleAdd = useCallback(() => {
    router.push('/appointments/new' as never);
  }, [router]);

  const handleOpen = useCallback(
    (id: string) => {
      router.push(`/appointments/${id}` as never);
    },
    [router],
  );

  return (
    <>
      <MainScreen title="Visits" scrollable>
        {next ? (
          <Pressable onPress={() => handleOpen(next.id)}>
            <HeroCard tone="teal">
              <ThemedText type="caption" themeColor="textSecondary">
                NEXT VISIT
              </ThemedText>
              <ThemedText type="display" style={{ color: BrandColors.teal }}>
                {next.title}
              </ThemedText>
              <ThemedText type="defaultBold">
                {formatAppointmentDate(next.date)} · {next.time}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {relativeDayLabel(next.date)}
              </ThemedText>
              <View style={styles.heroFooter}>
                <ThemedText type="small" themeColor="textSecondary">
                  📍 {next.location}
                </ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{ color: BrandColors.teal }}>
                  Tap to view →
                </ThemedText>
              </View>
            </HeroCard>
          </Pressable>
        ) : (
          <HeroCard tone="teal">
            <ThemedText type="caption" themeColor="textSecondary">
              NEXT VISIT
            </ThemedText>
            <ThemedText type="display" style={{ color: BrandColors.teal }}>
              No upcoming visits
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Schedule your next chair visit with the button below.
            </ThemedText>
          </HeroCard>
        )}

        {upcoming.length > 1 ? (
          <View style={styles.summaryRow}>
            <Pill tone="teal">{`${upcoming.length} upcoming`}</Pill>
          </View>
        ) : null}

        <SectionHeading rightLabel="+ Add" onRightPress={handleAdd}>
          All visits
        </SectionHeading>

        {ordered.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <CardList>
            {ordered.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onPress={() => handleOpen(appointment.id)}
              />
            ))}
          </CardList>
        )}

        <View style={{ height: Spacing.five }} />
      </MainScreen>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={handleAdd}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Add a new appointment">
          <ThemedText type="defaultBold" style={styles.fabText}>
            + New appointment
          </ThemedText>
        </Pressable>
      </View>
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.empty}>
      <ThemedText type="title" style={styles.emptyTitle}>
        No visits yet
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.emptyBody}>
        Add your first chair visit — wire tightening, bracket check, anything.
      </ThemedText>
      <Pressable onPress={onAdd} style={styles.emptyCta}>
        <ThemedText type="smallBold" style={styles.emptyCtaText}>
          + Add appointment
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  heroFooter: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
    padding: Spacing.four,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.two,
    ...Shadows.card,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: Spacing.two,
    backgroundColor: BrandColors.teal,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    ...Shadows.soft,
  },
  emptyCtaText: {
    color: '#FFFFFF',
  },
  fabWrap: {
    position: 'absolute',
    bottom: Spacing.five,
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
  },
  fab: {
    backgroundColor: BrandColors.teal,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: 999,
    ...Shadows.hero,
  },
  fabText: {
    color: '#FFFFFF',
  },
});