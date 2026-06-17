export type AppointmentStatus = 'Upcoming' | 'Completed' | 'Missed';

export type Appointment = {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD). The user keys this in manually in the wizard. */
  date: string;
  /** Free-form display time, e.g. "10:00 AM". */
  time: string;
  location: string;
  notes: string;
  status: AppointmentStatus;
};

/**
 * Stats tile shown at the top of the Visits tab.
 */
export type AppointmentStats = {
  label: string;
  value: string;
  tone: 'teal' | 'green' | 'pink';
};

/**
 * Quick-pick visit-type option shown on step 1 of the new-appointment
 * wizard.  Users can still type a custom title (handled by the form).
 */
export type AppointmentTypeOption = {
  id: string;
  title: string;
  icon: string;
  helper: string;
};

/**
 * Time-of-day suggestion shown alongside the manual time input.  Picking
 * one fills the time field; the user is free to type any other time.
 */
export type AppointmentTimeOption = {
  id: string;
  time: string;
  period: 'Morning' | 'Afternoon' | 'Evening';
};

/**
 * Kept for backward compatibility with any legacy import paths.
 */
export type AppointmentDateOption = {
  id: string;
  day: string;
  date: string;
  month: string;
  label: string;
};

export type AppointmentTimeSlot = {
  id: string;
  time: string;
  available: boolean;
};

/**
 * Shape of the new-appointment wizard draft.  Lives in component state,
 * not the data store, until the user taps Save.
 */
export type AppointmentDraft = {
  title: string;
  date: string;
  time: string;
  location: string;
  notes: string;
};