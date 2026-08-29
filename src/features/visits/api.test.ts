import { visitFromApi, visitToApi } from '@/features/visits/api';

test('visitFromApi splits the ISO datetime, maps status and clinic', () => {
  expect(
    visitFromApi({
      id: 12,
      title: 'Adjustment',
      appointment_date: '2026-09-10T14:30:00+00:00',
      type: null,
      status: 'scheduled',
      doctor_name: null,
      clinic_name: 'Ortho Care',
      cost: null,
      currency: 'MYR',
      notes: null,
      created_at: '2026-08-29T00:00:00+00:00',
    }),
  ).toEqual({
    id: '12',
    title: 'Adjustment',
    date: '2026-09-10',
    time: '14:30',
    location: 'Ortho Care',
    notes: undefined,
    status: 'upcoming',
  });
});

test('status maps both ways: scheduled↔upcoming, cancelled reads as missed', () => {
  const base = {
    id: 1, title: 't', appointment_date: '2026-01-01T09:00:00+00:00', type: null,
    doctor_name: null, clinic_name: null, cost: null, currency: 'MYR', notes: null,
    created_at: null,
  };
  expect(visitFromApi({ ...base, status: 'completed' }).status).toBe('completed');
  expect(visitFromApi({ ...base, status: 'missed' }).status).toBe('missed');
  expect(visitFromApi({ ...base, status: 'cancelled' }).status).toBe('missed');
  expect(visitFromApi({ ...base, status: null }).status).toBe('upcoming');
});

test('visitToApi joins date+time, maps location and status, never sends type', () => {
  const body = visitToApi({
    title: 'Wire change',
    date: '2026-09-10',
    time: '14:30',
    location: 'Clinic',
    notes: undefined,
    status: 'upcoming',
  });
  expect(body).toEqual({
    title: 'Wire change',
    appointment_date: '2026-09-10 14:30:00',
    status: 'scheduled',
    clinic_name: 'Clinic',
    notes: null,
  });
  expect(body).not.toHaveProperty('type');
});
