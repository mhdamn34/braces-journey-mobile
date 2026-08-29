import { fetchProfile } from '@/features/profile/api';
import type { Profile } from '@/features/profile/types';
import { todayIso } from '@/lib/dates';
import { createApiStore } from '@/lib/store/create-api-store';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  clinicName: '',
  treatmentStartDate: todayIso(),
  plannedMonths: 24,
};

export const profileStore = createApiStore<Profile>('profile.json', DEFAULT_PROFILE, fetchProfile);
