import { router } from 'expo-router';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { profileStore } from '@/features/profile/store';

export default function OnboardingScreen() {
  return (
    <Screen scroll={false}>
      <EmptyState voice="Welcome to BracesJourney" body="Onboarding is built in Task 10.">
        <Button
          label="Skip for now"
          onPress={() => {
            profileStore.update((p) => ({ ...p, onboardedAt: new Date().toISOString() }));
            router.replace('/');
          }}
        />
      </EmptyState>
    </Screen>
  );
}
