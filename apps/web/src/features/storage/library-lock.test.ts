import { describe, expect, it } from 'vitest';

import { withLibraryLock } from './library-lock';

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('withLibraryLock', () => {
  it('runs tasks one at a time, in order', async () => {
    const events: string[] = [];

    await Promise.all([
      withLibraryLock(async () => {
        events.push('first start');
        await pause(20);
        events.push('first end');
      }),
      withLibraryLock(async () => {
        events.push('second start');
        events.push('second end');
      }),
    ]);

    expect(events).toEqual([
      'first start',
      'first end',
      'second start',
      'second end',
    ]);
  });

  it('keeps going after a task fails', async () => {
    const failed = withLibraryLock(() => Promise.reject(new Error('Broken')));
    const next = withLibraryLock(() => Promise.resolve('done'));

    await expect(failed).rejects.toThrow('Broken');
    await expect(next).resolves.toBe('done');
  });

  it('returns what the task returns', async () => {
    await expect(withLibraryLock(() => Promise.resolve(42))).resolves.toBe(42);
  });
});
