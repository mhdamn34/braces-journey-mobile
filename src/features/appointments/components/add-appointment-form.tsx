import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  BrandColors,
  Radii,
  Shadows,
  Spacing,
  Tints,
} from '@/constants/theme';
import {
  appointmentTimeOptions,
  appointmentTypeOptions,
} from '@/features/appointments/data/appointments';
import type { AppointmentDraft } from '@/features/appointments/types';
import {
  formatAppointmentDate,
  formatAppointmentShort,
  formatTimeInput,
  parseIsoDate,
  relativeDayLabel,
  todayIso,
  todayPlusIso,
} from '@/features/appointments/utils/format-appointment-date';

type AddAppointmentFormProps = {
  initialDraft?: Partial<AppointmentDraft>;
  onCancel: () => void;
  onSave: (draft: AppointmentDraft) => void;
};

const STEPS = [
  { key: 'type', title: 'Visit type', helper: 'What kind of visit is it?' },
  { key: 'when', title: 'Date & time', helper: 'When is your next appointment?' },
  {
    key: 'details',
    title: 'Location & notes',
    helper: 'Where and any reminders?',
  },
  { key: 'review', title: 'Review', helper: 'Looks good?' },
] as const;

const DEFAULT_LOCATION = 'Ortho Care Clinic';

type StepIndex = 0 | 1 | 2 | 3;

/**
 * Multi-step wizard that captures a new appointment.  The user keys in
 * their own date (YYYY-MM-DD) and time (HH:MM) on step 2 — there is no
 * preset date strip.
 */
export function AddAppointmentForm({
  initialDraft,
  onCancel,
  onSave,
}: AddAppointmentFormProps) {
  const [step, setStep] = useState<StepIndex>(0);
  const [draft, setDraft] = useState<AppointmentDraft>({
    title: initialDraft?.title ?? '',
    date: initialDraft?.date ?? '',
    time: initialDraft?.time ?? '',
    location: initialDraft?.location ?? DEFAULT_LOCATION,
    notes: initialDraft?.notes ?? '',
  });

  const dateError = useMemo(() => {
    if (!draft.date) return 'Pick a date for your visit.';
    if (!parseIsoDate(draft.date)) return 'Use the format YYYY-MM-DD.';
    return null;
  }, [draft.date]);

  const timeError = useMemo(() => {
    if (!draft.time) return 'Pick a time for your visit.';
    if (!formatTimeInput(draft.time)) return 'Use HH:MM, e.g. 10:00 AM.';
    return null;
  }, [draft.time]);

  const canAdvance = useMemo(() => {
    if (step === 0) return draft.title.trim().length > 0;
    if (step === 1) return !dateError && !timeError;
    if (step === 2) return draft.location.trim().length > 0;
    return true;
  }, [step, draft, dateError, timeError]);

  const normalizedTime = formatTimeInput(draft.time);

  function patch<K extends keyof AppointmentDraft>(
    key: K,
    value: AppointmentDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleNext() {
    if (step === 1 && normalizedTime) {
      // Normalise the time on advance so the review step looks tidy.
      setDraft((current) => ({ ...current, time: normalizedTime }));
    }
    if (step < 3) setStep(((step + 1) as StepIndex));
  }

  function handleBack() {
    if (step > 0) setStep(((step - 1) as StepIndex));
  }

  function handleSave() {
    if (!canAdvance || dateError || timeError) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      location: draft.location.trim() || DEFAULT_LOCATION,
      date: draft.date.trim(),
      time: (normalizedTime ?? draft.time).trim(),
      notes: draft.notes.trim(),
    });
  }

  function applyQuickDate(days: number, label: string) {
    patch('date', todayPlusIso(days));
    patch('time', ''); // reset time so the user re-confirms it
    // small visual feedback via the helper text — keeps it inline.
    setStep(1);
    // The label is informational only — surfaced via the date hint card.
    patch('notes', draft.notes || '');
    void label;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.stepperRow}>
        {STEPS.map((entry, index) => {
          const isActive = index === step;
          const isComplete = index < step;
          const tint = isActive || isComplete ? BrandColors.teal : '#D6E0EE';
          return (
            <View key={entry.key} style={styles.stepDotCol}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: tint },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={styles.stepDotText}>
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={{
                  color: isActive ? BrandColors.navy : '#7889A0',
                  fontWeight: isActive ? '700' : '500',
                }}>
                {entry.title}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="caption" themeColor="textSecondary">
          STEP {step + 1} OF {STEPS.length}
        </ThemedText>
        <ThemedText type="title">{STEPS[step].title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {STEPS[step].helper}
        </ThemedText>

        <View style={styles.stepBody}>
          {step === 0 ? (
            <StepType
              value={draft.title}
              onChangeTitle={(title) => patch('title', title)}
            />
          ) : null}
          {step === 1 ? (
            <StepWhen
              date={draft.date}
              time={draft.time}
              dateError={dateError}
              timeError={timeError}
              onChangeDate={(value) => patch('date', value)}
              onChangeTime={(value) => patch('time', value)}
              onQuickDate={applyQuickDate}
            />
          ) : null}
          {step === 2 ? (
            <StepDetails
              location={draft.location}
              notes={draft.notes}
              onChangeLocation={(value) => patch('location', value)}
              onChangeNotes={(value) => patch('notes', value)}
            />
          ) : null}
          {step === 3 ? (
            <StepReview draft={draft} />
          ) : null}
        </View>
      </ThemedView>

      <View style={styles.actionsRow}>
        {step === 0 ? (
          <Pressable onPress={onCancel} style={styles.secondaryButton}>
            <ThemedText type="smallBold" style={styles.secondaryButtonText}>
              Cancel
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={handleBack} style={styles.secondaryButton}>
            <ThemedText type="smallBold" style={styles.secondaryButtonText}>
              Back
            </ThemedText>
          </Pressable>
        )}

        {step < 3 ? (
          <Pressable
            onPress={handleNext}
            disabled={!canAdvance}
            style={[
              styles.primaryButton,
              !canAdvance && styles.primaryButtonDisabled,
            ]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              Next →
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSave}
            disabled={!canAdvance}
            style={[
              styles.primaryButton,
              !canAdvance && styles.primaryButtonDisabled,
            ]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              Save appointment
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Step 1: visit type ────────────────────────────────────────────────────

function StepType({
  value,
  onChangeTitle,
}: {
  value: string;
  onChangeTitle: (value: string) => void;
}) {
  const customSelected = !appointmentTypeOptions.some((o) => o.title === value);

  return (
    <View style={styles.gap}>
      <View style={styles.chipGrid}>
        {appointmentTypeOptions.map((option) => {
          const selected = option.title === value;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChangeTitle(option.title)}
              style={[
                styles.typeCard,
                {
                  backgroundColor: selected ? Tints.teal.softer : '#FFFFFF',
                  borderColor: selected ? BrandColors.teal : '#DDE5F0',
                },
              ]}>
              <ThemedText style={styles.typeIcon}>{option.icon}</ThemedText>
              <View style={styles.typeText}>
                <ThemedText type="smallBold">{option.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {option.helper}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Or type a custom title</ThemedText>
        <View
          style={[
            styles.inputWrap,
            customSelected && styles.inputWrapFocused,
          ]}>
          <TextInput
            value={value}
            onChangeText={onChangeTitle}
            placeholder="e.g. Invisalign tray swap"
            placeholderTextColor="#8A99AE"
            style={styles.input}
            returnKeyType="next"
          />
        </View>
      </View>
    </View>
  );
}

// ─── Step 2: date + time (KEY-IN flow) ─────────────────────────────────────

function StepWhen({
  date,
  time,
  dateError,
  timeError,
  onChangeDate,
  onChangeTime,
  onQuickDate,
}: {
  date: string;
  time: string;
  dateError: string | null;
  timeError: string | null;
  onChangeDate: (value: string) => void;
  onChangeTime: (value: string) => void;
  onQuickDate: (days: number, label: string) => void;
}) {
  const dateLabel = date && parseIsoDate(date) ? formatAppointmentShort(date) : null;
  const relative = date && parseIsoDate(date) ? relativeDayLabel(date) : null;

  return (
    <View style={styles.gap}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Date</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          Tap a quick pick or type your own (YYYY-MM-DD).
        </ThemedText>
        <View style={styles.quickDateRow}>
          <Pressable
            onPress={() => onQuickDate(1, 'Tomorrow')}
            style={styles.quickDateChip}>
            <ThemedText type="smallBold" style={styles.quickDateText}>
              Tomorrow
            </ThemedText>
            <ThemedText type="caption" style={styles.quickDateSub}>
              {formatAppointmentShort(todayPlusIso(1))}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => onQuickDate(7, 'In 1 week')}
            style={styles.quickDateChip}>
            <ThemedText type="smallBold" style={styles.quickDateText}>
              +1 week
            </ThemedText>
            <ThemedText type="caption" style={styles.quickDateSub}>
              {formatAppointmentShort(todayPlusIso(7))}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => onQuickDate(14, 'In 2 weeks')}
            style={styles.quickDateChip}>
            <ThemedText type="smallBold" style={styles.quickDateText}>
              +2 weeks
            </ThemedText>
            <ThemedText type="caption" style={styles.quickDateSub}>
              {formatAppointmentShort(todayPlusIso(14))}
            </ThemedText>
          </Pressable>
        </View>
        <View style={[styles.inputWrap, dateError ? styles.inputWrapError : null]}>
          <TextInput
            value={date}
            onChangeText={onChangeDate}
            placeholder={todayIso()}
            placeholderTextColor="#8A99AE"
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="next"
            maxLength={10}
          />
        </View>
        {dateError ? (
          <ThemedText type="caption" style={styles.errorText}>
            {dateError}
          </ThemedText>
        ) : null}
        {dateLabel && relative ? (
          <View style={styles.datePreview}>
            <ThemedText type="smallBold" style={{ color: BrandColors.teal }}>
              {dateLabel} · {relative}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Time</ThemedText>
        <View style={styles.chipGrid}>
          {appointmentTimeOptions.map((option) => {
            const selected = time.trim() === option.time;
            return (
              <Pressable
                key={option.id}
                onPress={() => onChangeTime(option.time)}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: selected ? Tints.teal.softer : '#FFFFFF',
                    borderColor: selected ? BrandColors.teal : '#DDE5F0',
                  },
                ]}>
                <ThemedText type="smallBold">{option.time}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {option.period}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          Or type a time, e.g. 10:00 AM.
        </ThemedText>
        <View style={[styles.inputWrap, timeError ? styles.inputWrapError : null]}>
          <TextInput
            value={time}
            onChangeText={onChangeTime}
            placeholder="10:00 AM"
            placeholderTextColor="#8A99AE"
            style={styles.input}
            returnKeyType="next"
            maxLength={12}
          />
        </View>
        {timeError ? (
          <ThemedText type="caption" style={styles.errorText}>
            {timeError}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

// ─── Step 3: location + notes ──────────────────────────────────────────────

function StepDetails({
  location,
  notes,
  onChangeLocation,
  onChangeNotes,
}: {
  location: string;
  notes: string;
  onChangeLocation: (value: string) => void;
  onChangeNotes: (value: string) => void;
}) {
  return (
    <View style={styles.gap}>
      <View style={styles.field}>
        <ThemedText type="smallBold">Location</ThemedText>
        <View style={styles.inputWrap}>
          <TextInput
            value={location}
            onChangeText={onChangeLocation}
            placeholder="Ortho Care Clinic"
            placeholderTextColor="#8A99AE"
            style={styles.input}
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="smallBold">Notes (optional)</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          Anything to bring up at the chair, like poking wires or elastics.
        </ThemedText>
        <View style={[styles.inputWrap, styles.inputWrapMultiline]}>
          <TextInput
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="e.g. Bring extra elastics, mention wire on lower right"
            placeholderTextColor="#8A99AE"
            style={[styles.input, styles.inputMultiline]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  );
}

// ─── Step 4: review ────────────────────────────────────────────────────────

function StepReview({ draft }: { draft: AppointmentDraft }) {
  const relative = draft.date ? relativeDayLabel(draft.date) : null;
  const prettyDate = draft.date ? formatAppointmentDate(draft.date) : '—';

  return (
    <View style={styles.gap}>
      <View style={styles.reviewRow}>
        <ThemedText type="caption" themeColor="textSecondary">
          VISIT TYPE
        </ThemedText>
        <ThemedText type="defaultBold">{draft.title || '—'}</ThemedText>
      </View>
      <View style={styles.reviewRow}>
        <ThemedText type="caption" themeColor="textSecondary">
          DATE
        </ThemedText>
        <ThemedText type="defaultBold">{prettyDate}</ThemedText>
        {relative ? (
          <ThemedText type="small" style={{ color: BrandColors.teal }}>
            {relative}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.reviewRow}>
        <ThemedText type="caption" themeColor="textSecondary">
          TIME
        </ThemedText>
        <ThemedText type="defaultBold">
          {formatTimeInput(draft.time) ?? draft.time ?? '—'}
        </ThemedText>
      </View>
      <View style={styles.reviewRow}>
        <ThemedText type="caption" themeColor="textSecondary">
          LOCATION
        </ThemedText>
        <ThemedText type="defaultBold">{draft.location || '—'}</ThemedText>
      </View>
      {draft.notes ? (
        <View style={styles.reviewRow}>
          <ThemedText type="caption" themeColor="textSecondary">
            NOTES
          </ThemedText>
          <ThemedText type="small">{draft.notes}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.four,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  stepDotCol: {
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    color: '#FFFFFF',
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radii.md,
    gap: Spacing.two,
    ...Shadows.card,
  },
  stepBody: {
    marginTop: Spacing.two,
  },
  gap: {
    gap: Spacing.three,
  },
  chipGrid: {
    gap: Spacing.two,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  typeIcon: {
    fontSize: 28,
  },
  typeText: {
    flex: 1,
    gap: 2,
  },
  field: {
    gap: Spacing.one,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#DDE5F0',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#FFFFFF',
  },
  inputWrapFocused: {
    borderColor: BrandColors.teal,
  },
  inputWrapError: {
    borderColor: BrandColors.pink,
  },
  inputWrapMultiline: {
    paddingVertical: Spacing.two,
  },
  input: {
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: BrandColors.navy,
  },
  inputMultiline: {
    minHeight: 96,
  },
  errorText: {
    color: BrandColors.pink,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  quickDateChip: {
    flex: 1,
    backgroundColor: Tints.teal.softer,
    borderColor: Tints.teal.line,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
  quickDateText: {
    color: BrandColors.teal,
  },
  quickDateSub: {
    color: BrandColors.teal,
    opacity: 0.7,
  },
  timeChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  datePreview: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  reviewRow: {
    gap: Spacing.half,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F7',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: BrandColors.teal,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    ...Shadows.soft,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A9C8CF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDE5F0',
  },
  secondaryButtonText: {
    color: BrandColors.navy,
  },
});