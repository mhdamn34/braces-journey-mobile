import type { FaceAlignment } from '@/features/capture/alignment/types';

export type BracketColor = { name: string; hex: string };

export type EntryPhoto = {
  uri: string; // file:// under documentDirectory/photos/
  width: number;
  height: number;
  capturedAt: string; // ISO datetime
};

/** Where a photo is in the server's detection pipeline.
 *  'pending' = queued or not yet attempted; 'failed' = detection ran and found
 *  no usable face, which is the only honest moment to offer manual taps. */
export type AlignmentStatus = 'pending' | 'detected' | 'failed' | 'manual';

export type JourneyEntry = {
  id: string;
  monthNumber: number; // 1-based month of treatment; unique across entries
  date: string; // ISO date of the entry
  photo?: EntryPhoto;
  /** Landmarks used to normalize this photo. Absent = never aligned. */
  alignment?: FaceAlignment;
  /** Absent on cached rows written before detection shipped. */
  alignmentStatus?: AlignmentStatus;
  bracketColor?: BracketColor;
  note?: string;
  appointmentId?: string; // the visit that started this month, if any
};
