import { entryFromApi } from '@/features/journey/api';

const base = {
  id: 9,
  month_number: 7,
  photo_date: '2026-08-25',
  bracket_color_name: 'Teal',
  bracket_color_hex: '#3FAE9D',
  notes: 'Gap closing',
  appointment_id: 4,
  photo_url: 'https://api.test/api/mobile/v1/photos/9',
  created_at: '2026-08-25T00:00:00+00:00',
};

test('entryFromApi maps every field and stringifies ids', () => {
  expect(entryFromApi(base, 'file:///photos/9.jpg')).toEqual({
    id: '9',
    monthNumber: 7,
    date: '2026-08-25',
    photo: {
      uri: 'file:///photos/9.jpg',
      width: 1200,
      height: 1600,
      capturedAt: '2026-08-25T12:00:00.000Z',
    },
    bracketColor: { name: 'Teal', hex: '#3FAE9D' },
    note: 'Gap closing',
    appointmentId: '4',
  });
});

test('entryFromApi handles note-only entries and missing colour/link', () => {
  expect(
    entryFromApi(
      { ...base, bracket_color_name: null, bracket_color_hex: null, notes: null, appointment_id: null, photo_url: null },
      undefined,
    ),
  ).toEqual({
    id: '9',
    monthNumber: 7,
    date: '2026-08-25',
    photo: undefined,
    bracketColor: undefined,
    note: undefined,
    appointmentId: undefined,
  });
});
