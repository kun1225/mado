import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLocalPreference } from './use-local-preference';

const KEY = 'mado:test-look';

let values: Map<string, string>;

function makeLook() {
  return createLocalPreference({
    key: KEY,
    values: ['folder', 'book'] as const,
    fallback: 'folder',
  });
}

beforeEach(() => {
  values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('createLocalPreference', () => {
  it('uses the fallback when nothing is saved', () => {
    expect(makeLook().read()).toBe('folder');
  });

  it('reads back a stored value', () => {
    const look = makeLook();
    look.store('book');

    expect(values.get(KEY)).toBe('"book"');
    expect(look.read()).toBe('book');
  });

  it('uses the fallback for a value it does not know', () => {
    values.set(KEY, '"scroll"');

    expect(makeLook().read()).toBe('folder');
  });

  it('uses the fallback for broken JSON', () => {
    values.set(KEY, '{not json');

    expect(makeLook().read()).toBe('folder');
  });

  it('uses the fallback when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });

    expect(makeLook().read()).toBe('folder');
  });

  it('still tells listeners when saving fails', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    });
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const look = makeLook();
    const listener = vi.fn();
    const unsubscribe = look.subscribe(listener);

    look.store('book');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();
    unsubscribe();
    error.mockRestore();
  });

  it('tells listeners when a value is stored, and stops after unsubscribe', () => {
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const look = makeLook();
    const listener = vi.fn();
    const unsubscribe = look.subscribe(listener);

    look.store('book');
    unsubscribe();
    look.store('folder');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
