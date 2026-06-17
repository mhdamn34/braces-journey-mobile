export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type DashboardTask = {
  icon?: string;
  title: string;
  description: string;
};

export type TodaySummaryItem = {
  label: string;
  value: string;
  helper: string;
  tone: 'teal' | 'blue' | 'pink' | 'green' | 'navy';
};

export type TreatmentSummary = {
  patientName: string;
  currentStage: string;
  progressPercent: number;
  monthsCompleted: number;
  monthsTotal: number;
  nextAppointment: string;
  braceColor?: string;
  comfort?: number;
};

export type DashboardAction = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: 'teal' | 'blue' | 'pink' | 'green' | 'navy';
};

export type DashboardPhotoPreview = {
  month: string;
  caption: string;
  score: number;
  capturedAt: string;
  tone: 'teal' | 'blue' | 'pink' | 'green' | 'navy';
};
