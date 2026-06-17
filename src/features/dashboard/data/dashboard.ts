import type {
  ChartPoint,
  DashboardAction,
  DashboardTask,
  TodaySummaryItem,
  TreatmentSummary,
} from '@/features/dashboard/types';
import { formatCurrency } from '@/utils/format-currency';

export const treatmentSummary: TreatmentSummary = {
  patientName: 'Amin',
  currentStage: 'Alignment phase',
  progressPercent: 68,
  monthsCompleted: 12,
  monthsTotal: 18,
  nextAppointment: 'May 29, 10:00 AM',
  braceColor: 'Silver with blue ligatures',
  comfort: 2,
};

export const alignmentProgress: ChartPoint[] = [
  { label: 'Feb', value: 18 },
  { label: 'Mar', value: 30 },
  { label: 'Apr', value: 44 },
  { label: 'May', value: 58 },
  { label: 'Jun', value: 68 },
];

export const todayTasks: DashboardTask[] = [
  {
    icon: '🦷',
    title: 'Log tonight’s pain level',
    description: 'A 30-second check-in keeps your comfort trend accurate.',
  },
  {
    icon: '📸',
    title: 'Capture a progress photo',
    description: 'Same angle, same light — easiest way to spot real change.',
  },
  {
    icon: '🎀',
    title: 'Pick your next braces color',
    description: 'Pre-select before your visit so you’re in and out faster.',
  },
];

/**
 * Compact summary tiles shown right under the greeting.
 */
export const todaySummaryItems: TodaySummaryItem[] = [
  {
    label: 'Next visit',
    value: 'May 29',
    helper: '10:00 AM wire adjustment',
    tone: 'teal',
  },
  {
    label: 'Comfort',
    value: '2/10',
    helper: 'Mild soreness today',
    tone: 'blue',
  },
  {
    label: 'Next bill',
    value: formatCurrency(72, { showCents: false }),
    helper: 'Due Jun 10',
    tone: 'pink',
  },
];

/**
 * Quick action tiles for common tasks.
 */
export const dashboardActions: DashboardAction[] = [
  {
    id: 'log-comfort',
    title: 'Log comfort',
    description: '30s check-in',
    icon: '🩺',
    tone: 'teal',
  },
  {
    id: 'add-photo',
    title: 'Add photo',
    description: 'New progress shot',
    icon: '📸',
    tone: 'pink',
  },
  {
    id: 'pick-color',
    title: 'Pick color',
    description: 'Next visit',
    icon: '🎀',
    tone: 'blue',
  },
  {
    id: 'make-payment',
    title: 'Pay bill',
    description: 'RM 72 due',
    icon: '💳',
    tone: 'green',
  },
];

/**
 * Latest progress photo preview (front-end data only).
 */
export const latestPhotoPreview = {
  month: 'May',
  caption: 'After wire adjustment — front view',
  score: 82,
  capturedAt: 'May 24',
  tone: 'teal' as const,
};
