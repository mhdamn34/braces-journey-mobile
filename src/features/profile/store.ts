import type { Profile } from '@/features/profile/types';
import { todayIso } from '@/lib/dates';
import { createJsonStore } from '@/lib/store/create-json-store';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  clinicName: '',
  treatmentStartDate: todayIso(),
  plannedMonths: 24,
};

export const profileStore = createJsonStore<Profile>('profile.json', DEFAULT_PROFILE);
