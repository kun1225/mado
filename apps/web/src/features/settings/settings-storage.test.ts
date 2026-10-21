import { describe, expect, it } from 'vitest';

import type { Source } from '#/features/sources/source-types';

import { toStorageBreakdown } from './settings-storage';

function createSource(kind: Source['kind'], sizeBytes: number): Source {
  return {
    id: crypto.randomUUID(),
    name: 'source',
    url: null,
    note: null,
    tags: [],
    collectionIds: [],
    kind,
    fileName: 'file',
    mimeType: 'application/octet-stream',
    sizeBytes,
    width: null,
    height: null,
    durationSeconds: null,
    storageKey: null,
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    deletedAt: null,
  };
}

describe('toStorageBreakdown', () => {
  it('splits the usage by source kind and puts the rest in other', () => {
    const breakdown = toStorageBreakdown(1000, [
      createSource('video', 500),
      createSource('video', 100),
      createSource('image', 300),
      createSource('website', 0),
    ]);

    expect(breakdown.total).toBe(1000);
    expect(breakdown.parts.map(({ kind, bytes }) => [kind, bytes])).toEqual([
      ['videos', 600],
      ['images', 300],
      ['other', 100],
    ]);
  });

  it('grows the total when the files add up to more than the estimate', () => {
    const breakdown = toStorageBreakdown(100, [createSource('image', 250)]);

    expect(breakdown.total).toBe(250);
    expect(breakdown.parts[2].bytes).toBe(0);
  });

  it('shows only other for an empty library', () => {
    const breakdown = toStorageBreakdown(40, []);

    expect(breakdown.parts.map((part) => part.bytes)).toEqual([0, 0, 40]);
  });
});
