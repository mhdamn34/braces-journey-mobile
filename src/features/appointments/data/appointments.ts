import * as FileSystem from 'expo-file-system/legacy';
import type {
  Appointment,
  AppointmentStats,
  AppointmentTypeOption,
  AppointmentTimeOption,
} from '@/features/appointments/types';

/**
 * In-memory appointment store for the Visits tab.
 *
 * Backend persistence will be added later; for now every screen reads from
 * this module-level list and calls the mutators below to update it.
 *
 * The state is held outside of React so it survives screen mounts/unmounts
 * for the lifetime of the JS bundle (sufficient for the current UX demo).
 */

export const appointmentStats: AppointmentStats[] = [
  { label: 'Scheduled', value: '2', tone: 'teal' },
  { label: 'Completed', value: '8', tone: 'green' },
  { label: 'Missed', value: '0', tone: 'pink' },
];

/**
 * Quick-pick visit types shown on step 1 of the new-appointment wizard.
 * Users can also type a custom visit title (handled inside the form).
 */
export const appointmentTypeOptions: AppointmentTypeOption[] = [
  {
    id: 'wire-adjustment',
    title: 'Wire adjustment',
    icon: '🦷',
    helper: 'Routine tightening',
  },
  {
    id: 'bracket-check',
    title: 'Bracket check',
    icon: '🔍',
    helper: 'Inspect brackets & wires',
  },
  {
    id: 'elastic-review',
    title: 'Elastic review',
    icon: '🪢',
    helper: 'Check rubber bands',
  },
  {
    id: 'consultation',
    title: 'Consultation',
    icon: '💬',
    helper: 'Talk to your ortho',
  },
  {
    id: 'retainer-fit',
    title: 'Retainer fitting',
    icon: '🧩',
    helper: 'Post-treatment mould',
  },
];

/**
 * Time-of-day suggestions shown alongside the free-text time input.
 * Most ortho clinics run on a tight slot grid; these are reasonable
 * defaults the user can pick or ignore.
 */
export const appointmentTimeOptions: AppointmentTimeOption[] = [
  { id: '0900', time: '9:00 AM', period: 'Morning' },
  { id: '1000', time: '10:00 AM', period: 'Morning' },
  { id: '1130', time: '11:30 AM', period: 'Morning' },
  { id: '1430', time: '2:30 PM', period: 'Afternoon' },
  { id: '1600', time: '4:00 PM', period: 'Afternoon' },
  { id: '1730', time: '5:30 PM', period: 'Evening' },
];

const seedAppointments: Appointment[] = [
  {
    id: 'apt-wire-adjustment',
    title: 'Wire adjustment',
    date: '2026-06-19',
    time: '10:00 AM',
    location: 'Ortho Care Clinic',
    notes: 'Bring elastics. Mention the poking wire on the lower right.',
    status: 'Upcoming',
  },
  {
    id: 'apt-bracket-check',
    title: 'Bracket check',
    date: '2026-07-26',
    time: '9:30 AM',
    location: 'Ortho Care Clinic',
    notes: '',
    status: 'Upcoming',
  },
  {
    id: 'apt-elastic-review',
    title: 'Elastic review',
    date: '2026-04-05',
    time: '9:00 AM',
    location: 'Ortho Care Clinic',
    notes: '',
    status: 'Completed',
  },
  {
    id: 'apt-consultation',
    title: 'Consultation',
    date: '2026-02-14',
    time: '11:00 AM',
    location: 'Ortho Care Clinic',
    notes: 'Initial tray fitting.',
    status: 'Completed',
  },
];

const APPOINTMENTS_FILE = `${FileSystem.documentDirectory ?? ''}appointments.json`;

async function saveToDisk(data: Appointment[]) {
  try {
    if (!FileSystem.documentDirectory) return;
    await FileSystem.writeAsStringAsync(APPOINTMENTS_FILE, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save appointments to disk', err);
  }
}

async function loadFromDisk() {
  try {
    if (!FileSystem.documentDirectory) return;
    const info = await FileSystem.getInfoAsync(APPOINTMENTS_FILE);
    if (!info.exists) return;
    const raw = await FileSystem.readAsStringAsync(APPOINTMENTS_FILE);
    const parsed = JSON.parse(raw) as Appointment[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      appointmentStore = parsed;
      notify();
    }
  } catch (err) {
    console.warn('Failed to load appointments from disk', err);
  }
}

let appointmentStore: Appointment[] = [...seedAppointments];
const storeListeners = new Set<() => void>();

// Trigger initial load in background
loadFromDisk();

function notify() {
  storeListeners.forEach((listener) => listener());
}

/**
 * Subscribe to changes in the appointment store.  Returns an unsubscribe
 * function.  Used by screens that need to re-render when data changes.
 */
export function subscribeAppointments(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

export function listAppointments(): Appointment[] {
  // Newest date first so upcoming visits float to the top.
  return [...appointmentStore].sort((a, b) => a.date.localeCompare(b.date));
}

export function getAppointment(id: string): Appointment | undefined {
  return appointmentStore.find((appointment) => appointment.id === id);
}

export function getNextAppointment(): Appointment | undefined {
  return listAppointments().find((appointment) => appointment.status === 'Upcoming');
}

export function addAppointment(input: Omit<Appointment, 'id' | 'status'>): Appointment {
  const appointment: Appointment = {
    ...input,
    id: `apt-${Date.now()}`,
    status: 'Upcoming',
  };
  appointmentStore = [...appointmentStore, appointment];
  notify();
  saveToDisk(appointmentStore);
  return appointment;
}

export function updateAppointment(
  id: string,
  patch: Partial<Omit<Appointment, 'id'>>,
): Appointment | undefined {
  let updated: Appointment | undefined;
  appointmentStore = appointmentStore.map((appointment) => {
    if (appointment.id !== id) return appointment;
    updated = { ...appointment, ...patch };
    return updated;
  });
  if (updated) {
    notify();
    saveToDisk(appointmentStore);
  }
  return updated;
}

export function deleteAppointment(id: string) {
  appointmentStore = appointmentStore.filter((appointment) => appointment.id !== id);
  notify();
  saveToDisk(appointmentStore);
}

export function markAppointmentStatus(id: string, status: Appointment['status']) {
  return updateAppointment(id, { status });
}