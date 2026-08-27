export type VisitStatus = 'upcoming' | 'completed' | 'missed';

export type Visit = {
  id: string;
  title: string;
  date: string; // ISO date
  time: string; // HH:MM
  location: string;
  notes?: string;
  status: VisitStatus;
};
