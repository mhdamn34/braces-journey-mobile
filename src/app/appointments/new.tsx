import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MainScreen, ScreenHeader } from '@/components/main-screen';
import { BrandColors, Spacing } from '@/constants/theme';
import { AddAppointmentForm } from '@/features/appointments/components/add-appointment-form';
import { addAppointment } from '@/features/appointments/data/appointments';
import type { AppointmentDraft } from '@/features/appointments/types';

/**
 * /appointments/new
 *
 * 4-step wizard for adding a new appointment.  On Save, the appointment
 * is persisted to the in-memory store and we pop back to the visits tab.
 */
export default function NewAppointmentScreen() {
  const router = useRouter();

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const handleSave = useCallback(
    (draft: AppointmentDraft) => {
      addAppointment(draft);
      router.back();
    },
    [router],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MainScreen
        scrollable
        contentStyle={styles.content}>
        <ScreenHeader
          title="New appointment"
          subtitle="Plan your next chair visit"
          rightAction={
            <Pressable onPress={handleCancel} hitSlop={8}>
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
        <AddAppointmentForm onCancel={handleCancel} onSave={handleSave} />
      </MainScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.two,
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