const mockFiles = new Map<string, string>();
const mockDirs = new Set<string>();

jest.mock('expo-file-system', () => ({
  Paths: { document: '/docs' },
  Directory: class MockDirectory {
    uri: string;
    constructor(...segments: unknown[]) {
      this.uri = segments
        .map((s) => (typeof s === 'string' ? s : (s as { uri: string }).uri))
        .join('/');
    }
    get exists() {
      return mockDirs.has(this.uri);
    }
    create() {
      mockDirs.add(this.uri);
    }
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
    copy(to: { uri: string }) {
      mockFiles.set(to.uri, mockFiles.get(this.uri) ?? 'binary');
    }
    delete() {
      if (!mockFiles.has(this.uri)) throw new Error('missing');
      mockFiles.delete(this.uri);
    }
  },
}));

import { deletePhotoFile, persistPhotoFile } from '@/features/capture/photo-files';

beforeEach(() => {
  mockFiles.clear();
  mockDirs.clear();
});

describe('persistPhotoFile', () => {
  it('copies the temp capture into photos/ named by id', () => {
    mockFiles.set('file:///tmp/cam-abc.jpg', 'binary');
    const uri = persistPhotoFile('file:///tmp/cam-abc.jpg', 'e123');
    expect(uri).toBe('/docs/photos/e123.jpg');
    expect(mockFiles.has('/docs/photos/e123.jpg')).toBe(true);
    expect(mockDirs.has('/docs/photos')).toBe(true);
  });
  it('defaults unknown extensions to jpg', () => {
    mockFiles.set('file:///tmp/blob', 'binary');
    expect(persistPhotoFile('file:///tmp/blob', 'e1')).toBe('/docs/photos/e1.jpg');
  });
});

describe('deletePhotoFile', () => {
  it('deletes silently, even when the file is already gone', () => {
    mockFiles.set('/docs/photos/e1.jpg', 'binary');
    deletePhotoFile('/docs/photos/e1.jpg');
    expect(mockFiles.has('/docs/photos/e1.jpg')).toBe(false);
    expect(() => deletePhotoFile('/docs/photos/e1.jpg')).not.toThrow();
  });
});
