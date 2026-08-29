const mockFiles = new Map<string, string>();

jest.mock('expo-file-system', () => ({
  Paths: { document: '/docs' },
  Directory: class {
    uri = '/docs/photos';
    get exists() {
      return true;
    }
    create() {}
  },
  File: class MockFile {
    uri: string;
    constructor(...segments: unknown[]) {
      this.uri = segments
        .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
        .join('/');
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    text() {
      return mockFiles.get(this.uri)!;
    }
    textSync() {
      return mockFiles.get(this.uri)!;
    }
    write(content: string) {
      mockFiles.set(this.uri, content);
    }
    copy() {}
    delete() {}
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useFocusEffect: (cb: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(cb, [cb]);
  },
}));

jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: View };
});

jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual('react-native');
  return { SymbolView: View };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

import { act, render, screen } from '@testing-library/react-native';

import JourneyScreen from '@/app/(tabs)/index';
import { journeyStore } from '@/features/journey/store';
import { profileStore } from '@/features/profile/store';

describe('JourneyScreen', () => {
  beforeEach(() => {
    journeyStore.set([]);
    profileStore.update((p) => ({ ...p, treatmentStartDate: '2026-02-01' }));
    jest.useFakeTimers();
  });
  afterEach(async () => {
    await act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('shows the empty state, then the theater once an entry exists', async () => {
    await render(<JourneyScreen />);
    expect(screen.getByText('It starts with one photo')).toBeTruthy();

    await act(() => {
      journeyStore.set([
        {
          id: 'e1',
          monthNumber: 7,
          date: '2026-08-25',
          photo: {
            uri: '/docs/photos/e1.jpg',
            width: 100,
            height: 100,
            capturedAt: '2026-08-25T10:00:00.000Z',
          },
          bracketColor: { name: 'Pink', hex: '#E05C8A' },
          note: 'Wire tightened',
        },
      ]);
    });

    expect(screen.getByText('Month 7')).toBeTruthy();
    expect(screen.getByText('Month 7 · August')).toBeTruthy();
    expect(screen.getByText('Pink')).toBeTruthy();
  });
});
