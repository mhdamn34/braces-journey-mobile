import { profileStore } from '@/features/profile/store';
import type { BracesType, Profile } from '@/features/profile/types';
import { apiRequest } from '@/lib/api/client';

export type ApiProfile = {
  name: string;
  clinic_name: string | null;
  orthodontist_name: string | null;
  treatment_start_date: string | null;
  planned_months: number | null;
  braces_type: BracesType | null;
};

/** Server fields win; device-local fields (onboardedAt) and anything the
 * server has no value for fall back to `current`. */
export function profileFromApi(data: ApiProfile, current: Profile): Profile {
  return {
    ...current,
    name: data.name ?? '',
    clinicName: data.clinic_name ?? '',
    treatmentStartDate: data.treatment_start_date ?? current.treatmentStartDate,
    plannedMonths: data.planned_months ?? current.plannedMonths,
    bracesType: data.braces_type ?? undefined,
  };
}

export async function fetchProfile(current: Profile): Promise<Profile> {
  const res = await apiRequest<{ data: ApiProfile }>('GET', '/profile');
  return profileFromApi(res.data, current);
}

export async function saveProfile(input: {
  name: string;
  clinicName: string;
  treatmentStartDate: string;
  plannedMonths: number;
  bracesType?: BracesType;
}): Promise<void> {
  const body: Record<string, unknown> = {
    name: input.name,
    clinic_name: input.clinicName || null,
    treatment_start_date: input.treatmentStartDate,
    planned_months: input.plannedMonths,
  };
  if (input.bracesType) body.braces_type = input.bracesType;
  const res = await apiRequest<{ data: ApiProfile }>('PUT', '/profile', { body });
  profileStore.update((p) => profileFromApi(res.data, p));
}
