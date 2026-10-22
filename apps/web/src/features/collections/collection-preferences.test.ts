import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let readShowFolderSources: typeof import('./collection-preferences').readShowFolderSources;
let storeShowFolderSources: typeof import('./collection-preferences').storeShowFolderSources;
let parseShowFolderSources: typeof import('./collection-preferences').parseShowFolderSources;
let setStorageAccount: typeof import('../storage/storage-account').setStorageAccount;

let values: Map<string, string>;

beforeEach(async () => {
  vi.resetModules();
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });

  ({ readShowFolderSources, storeShowFolderSources, parseShowFolderSources } =
    await import('./collection-preferences'));
  ({ setStorageAccount } = await import('../storage/storage-account'));
});
afterEach(() => vi.unstubAllGlobals());

describe('readShowFolderSources', () => {
  it('shows folder sources when nothing is saved', () => {
    expect(readShowFolderSources()).toBe(true);
  });

  it('reads back the saved value', () => {
    storeShowFolderSources(false);

    expect(readShowFolderSources()).toBe(false);
  });

  it('shows folder sources when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });

    expect(readShowFolderSources()).toBe(true);
  });

  it('keeps a value for each account and for guests', () => {
    storeShowFolderSources(false);
    setStorageAccount('alice');
    expect(readShowFolderSources()).toBe(true);

    storeShowFolderSources(false);
    setStorageAccount('bob');
    expect(readShowFolderSources()).toBe(true);

    setStorageAccount('alice');
    expect(readShowFolderSources()).toBe(false);
    expect(values.get('mado:show-folder-sources')).toBe('false');
    expect(values.get('mado:show-folder-sources:alice')).toBe('false');
  });
});

describe('storeShowFolderSources', () => {
  it('does not throw when storage is blocked', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(() => storeShowFolderSources(false)).not.toThrow();
    consoleError.mockRestore();
  });
});

describe('parseShowFolderSources', () => {
  it.each([null, '', 'yes', '1', '{', '"false"'])(
    'falls back to true for %j',
    (raw) => {
      expect(parseShowFolderSources(raw)).toBe(true);
    },
  );

  it('reads true and false', () => {
    expect(parseShowFolderSources('true')).toBe(true);
    expect(parseShowFolderSources('false')).toBe(false);
  });
});
