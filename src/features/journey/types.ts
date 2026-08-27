export type BracketColor = { name: string; hex: string };

export type EntryPhoto = {
  uri: string; // file:// under documentDirectory/photos/
  width: number;
  height: number;
  capturedAt: string; // ISO datetime
};

export type JourneyEntry = {
  id: string;
  monthNumber: number; // 1-based month of treatment; unique across entries
  date: string; // ISO date of the entry
  photo?: EntryPhoto;
  bracketColor?: BracketColor;
  note?: string;
  appointmentId?: string; // the visit that started this month, if any
};
