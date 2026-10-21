import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatBytes, readStorageUsage } from './storage-usage';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1.00 KB'],
    [1.5 * 1024 ** 2, '1.50 MB'],
    [12.34 * 1024 ** 2, '12.3 MB'],
    [123.4 * 1024 ** 2, '123 MB'],
    [1.84 * 1024 ** 3, '1.84 GB'],
    [2048 * 1024 ** 4, '2048 TB'],
  ])('formats %d bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('readStorageUsage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the usage from the browser estimate', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: () => Promise.resolve({ usage: 42, quota: 1000 }) },
    });
    await expect(readStorageUsage()).resolves.toEqual({
      usage: 42,
      quota: 1000,
    });
  });

  it('returns null when the browser has no estimate', async () => {
    vi.stubGlobal('navigator', { storage: {} });
    await expect(readStorageUsage()).resolves.toBeNull();
  });

  it('returns null when the estimate fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('navigator', {
      storage: { estimate: () => Promise.reject(new Error('blocked')) },
    });
    await expect(readStorageUsage()).resolves.toBeNull();
  });
});
