export type BracesType = 'metal' | 'ceramic' | 'self-ligating' | 'lingual' | 'aligners';

export type Profile = {
  name: string;
  clinicName: string;
  treatmentStartDate: string; // ISO date — when the braces were/are fitted
  plannedMonths: number;
  bracesType?: BracesType;
  onboardedAt?: string; // ISO datetime; unset = show onboarding
};
