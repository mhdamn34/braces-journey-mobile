import {
  dueState,
  linkableVisitId,
  monthLabel,
  suggestedMonthNumber,
  suggestImportMonths,
} from '@/features/journey/logic';
import type { JourneyEntry } from '@/features/journey/types';
import type { Profile } from '@/features/profile/types';
import type { Visit } from '@/features/visits/types';

const profile: Profile = {
  name: 'Amin',
  clinicName: 'Ortho Care Clinic',
  treatmentStartDate: '2026-02-01',
  plannedMonths: 24,
};

function entry(overrides: Partial<JourneyEntry>): JourneyEntry {
  return {
    id: overrides.id ?? 'e1',
    monthNumber: overrides.monthNumber ?? 1,
    date: overrides.date ?? '2026-02-01',
    photo: overrides.photo ?? {
      uri: 'file:///docs/photos/e1.jpg',
      width: 100,
      height: 100,
      capturedAt: `${overrides.date ?? '2026-02-01'}T10:00:00.000Z`,
    },
    ...overrides,
  };
}

function visit(overrides: Partial<Visit>): Visit {
  return {
    id: overrides.id ?? 'v1',
    title: 'Adjustment',
    date: '2026-08-25',
    time: '10:00',
    location: 'Clinic',
    status: 'completed',
    ...overrides,
  };
}

describe('suggestedMonthNumber', () => {
  it('starts mid-journey installs at the elapsed month, not Month 1', () => {
    expect(suggestedMonthNumber([], profile, '2026-08-28')).toBe(7);
  });
  it('is Month 1 on the fitting day', () => {
    expect(suggestedMonthNumber([], profile, '2026-02-01')).toBe(1);
  });
  it('bumps past an already-captured month', () => {
    const entries = [entry({ id: 'a', monthNumber: 7, date: '2026-08-02' })];
    expect(suggestedMonthNumber(entries, profile, '2026-08-28')).toBe(8);
  });
  it('does not bump when the elapsed month is already ahead', () => {
    const entries = [entry({ id: 'a', monthNumber: 3, date: '2026-04-05' })];
    expect(suggestedMonthNumber(entries, profile, '2026-08-28')).toBe(7);
  });
});

describe('dueState', () => {
  it('is first with no entries', () => {
    expect(dueState([], [], '2026-08-28')).toBe('first');
  });
  it('is due when a completed visit is newer than the last photo', () => {
    const entries = [entry({ date: '2026-08-02' })];
    const visits = [visit({ date: '2026-08-25' })];
    expect(dueState(entries, visits, '2026-08-28')).toBe('due');
  });
  it('is done when the photo was taken on the visit day', () => {
    const entries = [entry({ date: '2026-08-25' })];
    const visits = [visit({ date: '2026-08-25' })];
    expect(dueState(entries, visits, '2026-08-28')).toBe('done');
  });
  it('is due 30+ days after the last photo even with no visit', () => {
    const entries = [entry({ date: '2026-07-01' })];
    expect(dueState(entries, [], '2026-08-28')).toBe('due');
  });
  it('is done shortly after a photo', () => {
    const entries = [entry({ date: '2026-08-20' })];
    expect(dueState(entries, [], '2026-08-28')).toBe('done');
  });
  it('ignores upcoming visits', () => {
    const entries = [entry({ date: '2026-08-20' })];
    const visits = [visit({ date: '2026-08-25', status: 'upcoming' })];
    expect(dueState(entries, visits, '2026-08-28')).toBe('done');
  });
});

describe('linkableVisitId', () => {
  it('returns the most recent completed visit not yet covered by a photo', () => {
    const entries = [entry({ date: '2026-08-02' })];
    const visits = [
      visit({ id: 'v-old', date: '2026-07-20' }),
      visit({ id: 'v-new', date: '2026-08-25' }),
    ];
    expect(linkableVisitId(entries, visits)).toBe('v-new');
  });
  it('returns undefined when the latest photo already covers the visit', () => {
    const entries = [entry({ date: '2026-08-25' })];
    const visits = [visit({ date: '2026-08-25' })];
    expect(linkableVisitId(entries, visits)).toBeUndefined();
  });
  it('links the most recent completed visit when there are no entries yet', () => {
    expect(linkableVisitId([], [visit({ id: 'v1', date: '2026-08-25' })])).toBe('v1');
  });
});

describe('suggestImportMonths', () => {
  it('maps photo dates to treatment months', () => {
    const months = suggestImportMonths(
      [
        { creationDateIso: '2026-02-10' },
        { creationDateIso: '2026-03-15' },
        { creationDateIso: '2026-05-24' },
      ],
      profile,
      [],
    );
    expect(months).toEqual([1, 2, 4]);
  });
  it('avoids existing months and keeps ascending order', () => {
    const months = suggestImportMonths(
      [{ creationDateIso: '2026-02-10' }, { creationDateIso: '2026-02-20' }],
      profile,
      [1],
    );
    expect(months).toEqual([2, 3]);
  });
  it('falls back to sequential for photos without dates', () => {
    const months = suggestImportMonths(
      [{ creationDateIso: '2026-04-05' }, {}, {}],
      profile,
      [],
    );
    expect(months).toEqual([3, 4, 5]);
  });
});

describe('monthLabel', () => {
  it('labels an entry', () => {
    expect(monthLabel(entry({ monthNumber: 7, date: '2026-08-25' }))).toBe('Month 7 · August');
  });
});
