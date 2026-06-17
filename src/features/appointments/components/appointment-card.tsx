import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import type { Appointment, AppointmentStatus } from '@/features/appointments/types';
import { formatAppointmentDate } from '@/features/appointments/utils/format-appointment-date';

type AppointmentCardProps = {
  appointment: Appointment;
  onPress?: () => void;
};

const statusColors: Record<
  AppointmentStatus,
  { background: string; text: string; pill: string }
> = {
  Upcoming: { background: '#E7F8FA', text: BrandColors.teal, pill: '🦷' },
  Completed: { background: '#EAF7EF', text: BrandColors.green, pill: '✅' },
  Missed: { background: '#FCE8F6', text: BrandColors.pink, pill: '⏰' },
};

/**
 * Compact appointment card used in the Visits tab list.  Tapping the card
 * opens the detail screen (when `onPress` is provided).
 */
export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const statusColor = statusColors[appointment.status];
  const dateLabel = formatAppointmentDate(appointment.date);

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.content}>
          <ThemedText type="smallBold">{appointment.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {dateLabel} · {appointment.time}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {appointment.location}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor.background },
          ]}>
          <ThemedText type="smallBold" style={{ color: statusColor.text }}>
            {appointment.status}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    shadowColor: '#0B2A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  content: {
    flex: 1,
    gap: Spacing.half,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
});