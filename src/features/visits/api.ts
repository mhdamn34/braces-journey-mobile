import type { Visit, VisitStatus } from '@/features/visits/types';

export type ApiVisit = {
  id: number;
  title: string;
  appointment_date: string | null;
  type: string | null;
  status: string | null;
  doctor_name: string | null;
  clinic_name: string | null;
  cost: number | null;
  currency: string;
  notes: string | null;
  created_at: string | null;
};

function statusFromApi(status: string | null): VisitStatus {
  if (status === 'completed') return 'completed';
  // A cancelled appointment didn't happen — closest app concept is missed.
  if (status === 'missed' || status === 'cancelled') return 'missed';
  return 'upcoming';
}

function statusToApi(status: VisitStatus): string {
  return status === 'upcoming' ? 'scheduled' : status;
}

export function visitFromApi(v: ApiVisit): Visit {
  const [date = '', timePart = ''] = (v.appointment_date ?? '').split('T');
  return {
    id: String(v.id),
    title: v.title,
    date,
    time: timePart ? timePart.slice(0, 5) : '09:00',
    location: v.clinic_name ?? '',
    notes: v.notes ?? undefined,
    status: statusFromApi(v.status),
  };
}

export function visitToApi(v: {
  title: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  status: VisitStatus;
}): Record<string, unknown> {
  return {
    title: v.title,
    appointment_date: `${v.date} ${v.time}:00`,
    status: statusToApi(v.status),
    clinic_name: v.location,
    notes: v.notes ?? null,
  };
}
