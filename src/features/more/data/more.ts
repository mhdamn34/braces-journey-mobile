import type { MoreAction, ProfileSummary } from '@/features/more/types';

export const profileSummary: ProfileSummary = {
  name: 'Amin',
  handle: '@bracesjourney',
  clinic: 'Ortho Care Clinic',
  treatmentStage: 'Alignment phase',
  nextVisit: 'May 29, 10:00 AM',
  stats: [
    { label: 'Months', value: '12/18' },
    { label: 'Photos', value: '5' },
    { label: 'Pain', value: '2/10' },
  ],
};

export const moreActions: MoreAction[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Treatment details and clinic info',
    tone: 'teal',
  },
  {
    id: 'reminders',
    label: 'Reminders',
    description: 'Appointment, photo, and payment alerts',
    tone: 'blue',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Notes, colors, and treatment changes',
    tone: 'green',
  },
  {
    id: 'colors',
    label: 'Color history',
    description: 'Track braces colors by visit',
    tone: 'pink',
  },
  {
    id: 'storage',
    label: 'Storage',
    description: 'Local photos during development',
    tone: 'green',
  },
];
