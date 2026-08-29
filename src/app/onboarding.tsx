import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { saveProfile } from '@/features/profile/api';
import {
  BracesStep,
  type BracesSituation,
} from '@/features/profile/components/onboarding/braces-step';
import { DetailsStep } from '@/features/profile/components/onboarding/details-step';
import { HistoryStep } from '@/features/profile/components/onboarding/history-step';
import { WelcomeStep } from '@/features/profile/components/onboarding/welcome-step';
import { profileStore } from '@/features/profile/store';
import type { BracesType } from '@/features/profile/types';
import { todayIso } from '@/lib/dates';
import { useAsyncAction } from '@/lib/use-async-action';
import { Space, Type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function OnboardingScreen() {
  const colors = useTheme();
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState<BracesSituation>('new');
  const [startDate, setStartDate] = useState(todayIso());
  const [plannedMonths, setPlannedMonths] = useState(24);
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [bracesType, setBracesType] = useState<BracesType | undefined>(undefined);

  const totalSteps = situation === 'existing' ? 4 : 3;

  const { run: finishRun, pending, error } = useAsyncAction(async (thenImport: boolean) => {
    await saveProfile({
      name: name.trim(),
      clinicName: clinicName.trim(),
      treatmentStartDate: startDate,
      plannedMonths,
      bracesType,
    });
    profileStore.update((p) => ({ ...p, onboardedAt: new Date().toISOString() }));
    router.replace('/');
    if (thenImport) router.push('/import-photos');
  });

  function finish() {
    void finishRun(false);
  }

  function finishToImport() {
    void finishRun(true);
  }

  function afterDetails() {
    if (situation === 'existing') setStep(3);
    else finish();
  }

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', gap: Space.sm, justifyContent: 'center' }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= step ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>
      {step > 0 ? (
        <Pressable onPress={() => setStep(step - 1)} hitSlop={8}>
          <Text style={[Type.label, { color: colors.textSecondary }]}>‹ Back</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={[Type.caption, { color: colors.danger }]}>{error}</Text> : null}
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && (
        <BracesStep
          situation={situation}
          startDate={startDate}
          plannedMonths={plannedMonths}
          onChange={(patch) => {
            if (patch.situation) setSituation(patch.situation);
            if (patch.startDate !== undefined) setStartDate(patch.startDate);
            if (patch.plannedMonths) setPlannedMonths(patch.plannedMonths);
          }}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <DetailsStep
          name={name}
          clinicName={clinicName}
          bracesType={bracesType}
          onChange={(patch) => {
            if (patch.name !== undefined) setName(patch.name);
            if (patch.clinicName !== undefined) setClinicName(patch.clinicName);
            if ('bracesType' in patch) setBracesType(patch.bracesType);
          }}
          onNext={afterDetails}
        />
      )}
      {step === 3 && <HistoryStep onImport={finishToImport} onFinish={finish} />}
    </Screen>
  );
}
