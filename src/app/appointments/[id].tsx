import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MainScreen, ScreenHeader } from '@/components/main-screen';
import {
  BrandColors,
  Radii,
  Shadows,
  Spacing,
  Tints,
} from '@/constants/theme';
import {
  deleteAppointment,
  getAppointment,
  markAppointmentStatus,
  subscribeAppointments,
  updateAppointment,
} from '@/features/appointments/data/appointments';
import type {
  Appointment,
  AppointmentStatus,
} from '@/features/appointments/types';
import {
  formatAppointmentDate,
  formatTimeInput,
  parseIsoDate,
  relativeDayLabel,
  todayIso,
} from '@/features/appointments/utils/format-appointment-date';

const STATUS_OPTIONS: AppointmentStatus[] = ['Upcoming', 'Completed', 'Missed'];

/**
 * /appointments/[id]
 *
 * Detail / edit screen for a single appointment.  The user can edit
 * date, time, location, notes, status; or delete the appointment.
 */
export default function AppointmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const [appointment, setAppointment] = useState<Appointment | undefined>(() =>
    getAppointment(id),
  );

  // Re-pull when the store changes (e.g. user edited it elsewhere).
  useEffect(() => {
    const unsubscribe = subscribeAppointments(() => {
      setAppointment(getAppointment(id));
    });
    return unsubscribe;
  }, [id]);

  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (!appointment) return;
    setEditDate(appointment.date);
    setEditTime(appointment.time);
    setEditLocation(appointment.location);
    setEditNotes(appointment.notes);
  }, [appointment]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSaveEdit = useCallback(() => {
    if (!appointment) return;
    const parsedTime = formatTimeInput(editTime);
    if (!parseIsoDate(editDate)) {
      Alert.alert('Invalid date', 'Please use the YYYY-MM-DD format.');
      return;
    }
    if (!parsedTime) {
      Alert.alert('Invalid time', 'Please use a time like 10:00 AM.');
      return;
    }
    updateAppointment(appointment.id, {
      date: editDate.trim(),
      time: parsedTime,
      location: editLocation.trim() || 'Ortho Care Clinic',
      notes: editNotes.trim(),
    });
    setIsEditing(false);
  }, [appointment, editDate, editTime, editLocation, editNotes]);

  const handleStatusChange = useCallback(
    (status: AppointmentStatus) => {
      if (!appointment) return;
      markAppointmentStatus(appointment.id, status);
    },
    [appointment],
  );

  const handleDelete = useCallback(() => {
    if (!appointment) return;
    Alert.alert(
      'Delete appointment?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAppointment(appointment.id);
            router.back();
          },
        },
      ],
      { cancelable: true },
    );
  }, [appointment, router]);

  if (!appointment) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <MainScreen scrollable>
          <ScreenHeader
            title="Visit not found"
            subtitle="That appointment may have been deleted."
            rightAction={
              <Pressable onPress={handleBack} hitSlop={8}>
                <View style={styles.closeButton}>
                  <ThemedText type="smallBold">Close</ThemedText>
                </View>
              </Pressable>
            }
          />
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="default">
              Try opening it again from the Visits tab.
            </ThemedText>
            <Pressable onPress={handleBack} style={styles.primaryButton}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Back to visits
              </ThemedText>
            </Pressable>
          </ThemedView>
        </MainScreen>
      </>
    );
  }

  const relative = relativeDayLabel(appointment.date);
  const prettyDate = formatAppointmentDate(appointment.date);
  const statusTone = statusColors[appointment.status];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MainScreen scrollable>
        <ScreenHeader
          title={appointment.title}
          subtitle={prettyDate}
          rightAction={
            <Pressable onPress={handleBack} hitSlop={8}>
              <View style={styles.closeButton}>
                <ThemedText
                  type="smallBold"
                  style={{ color: BrandColors.navy }}>
                  Close
                </ThemedText>
              </View>
            </Pressable>
          }
        />

        {/* Hero card */}
        <ThemedView
          type="backgroundElement"
          style={[styles.hero, { backgroundColor: statusTone.background }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            {appointment.status.toUpperCase()}
          </ThemedText>
          <ThemedText type="display" style={{ color: statusTone.text }}>
            {appointment.time}
          </ThemedText>
          <ThemedText type="defaultBold">{prettyDate}</ThemedText>
          {relative ? (
            <ThemedText type="small" themeColor="textSecondary">
              {relative}
            </ThemedText>
          ) : null}
          <View style={styles.heroFooter}>
            <ThemedText type="small" themeColor="textSecondary">
              📍 {appointment.location}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Status chips */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Status</ThemedText>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((status) => {
              const active = appointment.status === status;
              const tone = statusColors[status];
              return (
                <Pressable
                  key={status}
                  onPress={() => handleStatusChange(status)}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: active ? tone.background : '#FFFFFF',
                      borderColor: active ? tone.text : '#DDE5F0',
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: active ? tone.text : BrandColors.navy }}>
                    {status}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        {/* Edit form */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="smallBold">Details</ThemedText>
            {!isEditing ? (
              <Pressable onPress={() => setIsEditing(true)} hitSlop={8}>
                <ThemedText type="smallBold" style={styles.linkText}>
                  Edit
                </ThemedText>
              </Pressable>
            ) : (
              <View style={styles.editActions}>
                <Pressable onPress={() => setIsEditing(false)} hitSlop={8}>
                  <ThemedText
                    type="smallBold"
                    style={[styles.linkText, { color: '#7889A0' }]}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable onPress={handleSaveEdit} hitSlop={8}>
                  <ThemedText type="smallBold" style={styles.linkText}>
                    Save
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          <DetailRow label="Date">
            {isEditing ? (
              <TextInput
                value={editDate}
                onChangeText={setEditDate}
                placeholder={todayIso()}
                placeholderTextColor="#8A99AE"
                style={styles.input}
                maxLength={10}
                autoCorrect={false}
              />
            ) : (
              <ThemedText type="default">{appointment.date}</ThemedText>
            )}
          </DetailRow>

          <DetailRow label="Time">
            {isEditing ? (
              <TextInput
                value={editTime}
                onChangeText={setEditTime}
                placeholder="10:00 AM"
                placeholderTextColor="#8A99AE"
                style={styles.input}
                maxLength={12}
              />
            ) : (
              <ThemedText type="default">{appointment.time}</ThemedText>
            )}
          </DetailRow>

          <DetailRow label="Location">
            {isEditing ? (
              <TextInput
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Ortho Care Clinic"
                placeholderTextColor="#8A99AE"
                style={styles.input}
              />
            ) : (
              <ThemedText type="default">{appointment.location}</ThemedText>
            )}
          </DetailRow>

          <DetailRow label="Notes">
            {isEditing ? (
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Optional notes"
                placeholderTextColor="#8A99AE"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[styles.input, styles.inputMultiline]}
              />
            ) : (
              <ThemedText type="default">
                {appointment.notes || 'No notes yet.'}
              </ThemedText>
            )}
          </DetailRow>
        </ThemedView>

        {/* Danger zone */}
        <ThemedView type="backgroundElement" style={styles.card}>
          <Pressable onPress={handleDelete} style={styles.dangerButton}>
            <ThemedText type="smallBold" style={styles.dangerButtonText}>
              Delete appointment
            </ThemedText>
          </Pressable>
        </ThemedView>

        <View style={{ height: Spacing.four }} />
      </MainScreen>
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label.toUpperCase()}
      </ThemedText>
      <View style={styles.detailValue}>{children}</View>
    </View>
  );
}

const statusColors: Record<AppointmentStatus, { background: string; text: string }> = {
  Upcoming: { background: '#E7F8FA', text: BrandColors.teal },
  Completed: { background: '#EAF7EF', text: BrandColors.green },
  Missed: { background: '#FCE8F6', text: BrandColors.pink },
};

const styles = StyleSheet.create({
  hero: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
    gap: Spacing.one,
    ...Shadows.hero,
  },
  heroFooter: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radii.md,
    gap: Spacing.two,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statusChip: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailRow: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7',
  },
  detailValue: {
    minHeight: 28,
  },
  input: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    borderRadius: Radii.sm,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: BrandColors.navy,
  },
  inputMultiline: {
    minHeight: 96,
  },
  linkText: {
    color: Tints.teal.line,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dangerButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: BrandColors.pink,
    alignItems: 'center',
    backgroundColor: '#FDEEF6',
  },
  dangerButtonText: {
    color: BrandColors.pink,
  },
  primaryButton: {
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  closeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5F0',
  },
});