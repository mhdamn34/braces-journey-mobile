import type { FaceAlignment } from '@/features/capture/alignment/types';
import {
  alignmentFromApi,
  alignmentToApi,
  entryFromApi,
  type ApiFaceAlignment,
} from '@/features/journey/api';

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

const apiAlignment: ApiFaceAlignment = {
  left_eye: { x: 0.3, y: 0.3 },
  right_eye: { x: 0.7, y: 0.3 },
  nose_base: { x: 0.5, y: 0.45 },
  chin: { x: 0.5, y: 0.78 },
  roll_deg: 1.5,
  yaw_deg: -2,
  opening_ratio: 0.82,
  source: 'taps',
  version: 1,
};

const appAlignment: FaceAlignment = {
  leftEye: { x: 0.3, y: 0.3 },
  rightEye: { x: 0.7, y: 0.3 },
  noseBase: { x: 0.5, y: 0.45 },
  chin: { x: 0.5, y: 0.78 },
  rollDeg: 1.5,
  yawDeg: -2,
  openingRatio: 0.82,
  source: 'taps',
  version: 1,
};

test('alignmentFromApi maps snake_case to camelCase', () => {
  expect(alignmentFromApi(apiAlignment)).toEqual(appAlignment);
});

test('alignmentFromApi returns undefined for a null column', () => {
  expect(alignmentFromApi(null)).toBeUndefined();
});

test('alignmentToApi round-trips', () => {
  expect(alignmentFromApi(alignmentToApi(appAlignment))).toEqual(appAlignment);
});

test('entryFromApi carries alignment through', () => {
  const entry = entryFromApi({ ...base, alignment: apiAlignment }, 'file:///photos/9.jpg');
  expect(entry.alignment).toEqual(appAlignment);
});

test('entryFromApi leaves alignment undefined when the server sends null', () => {
  expect(entryFromApi({ ...base, alignment: null }, undefined).alignment).toBeUndefined();
});

test('entryFromApi tolerates a payload with no alignment key at all', () => {
  expect(entryFromApi(base, undefined).alignment).toBeUndefined();
});

test('maps pitch and alignment status from the API', () => {
  const entry = entryFromApi(
    {
      ...base,
      alignment_status: 'detected',
      alignment: {
        left_eye: { x: 0.269, y: 0.382 },
        right_eye: { x: 0.671, y: 0.353 },
        nose_base: { x: 0.478, y: 0.522 },
        chin: { x: 0.539, y: 1.044 },
        roll_deg: -4.12,
        yaw_deg: -2,
        pitch_deg: -15.3,
        opening_ratio: 1.026,
        source: 'mediapipe',
        version: 1,
      },
    },
    undefined,
  );

  expect(entry.alignmentStatus).toBe('detected');
  expect(entry.alignment?.pitchDeg).toBe(-15.3);
  expect(entry.alignment?.source).toBe('mediapipe');
  // Mesh vertices extrapolate past the frame edge; this must survive the mapper.
  expect(entry.alignment?.chin.y).toBe(1.044);
});

test('a server without pitch or status still maps cleanly', () => {
  const entry = entryFromApi(
    {
      ...base,
      alignment: {
        left_eye: { x: 0.26, y: 0.38 },
        right_eye: { x: 0.69, y: 0.35 },
        nose_base: { x: 0.46, y: 0.51 },
        chin: { x: 0.47, y: 0.92 },
        roll_deg: -5.39,
        yaw_deg: 0,
        opening_ratio: 0.952,
        source: 'taps',
        version: 1,
      },
    },
    undefined,
  );

  expect(entry.alignmentStatus).toBeUndefined();
  expect(entry.alignment?.pitchDeg).toBeUndefined();
});

test('alignmentToApi round-trips pitch', () => {
  const alignment: FaceAlignment = {
    leftEye: { x: 0.26, y: 0.38 },
    rightEye: { x: 0.69, y: 0.35 },
    noseBase: { x: 0.46, y: 0.51 },
    chin: { x: 0.47, y: 0.92 },
    rollDeg: -5.39,
    yawDeg: 0,
    pitchDeg: -15.3,
    openingRatio: 0.952,
    source: 'mediapipe',
    version: 1,
  };

  expect(alignmentToApi(alignment).pitch_deg).toBe(-15.3);
});
