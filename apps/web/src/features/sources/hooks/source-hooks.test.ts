import { describe, expect, it } from 'vitest';

import { toPendingSites, toTrashMessage } from './source-hooks';

describe('toTrashMessage', () => {
  it('names a single source', () => {
    expect(toTrashMessage([{ name: 'Sunset' }])).toBe('"Sunset" deleted');
  });

  it('shortens a long name with an ellipsis', () => {
    expect(
      toTrashMessage([{ name: 'Cole Derochie · Software Designer' }]),
    ).toBe('"Cole Derochie · Software…" deleted');
  });

  it('counts several sources', () => {
    expect(toTrashMessage([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe(
      '3 saves deleted',
    );
  });
});

describe('toPendingSites', () => {
  const inputs = [
    { id: 'site-1', collectionId: null, url: 'https://www.dribbble.com/shots' },
    { id: 'site-2', collectionId: 'c1', url: 'https://linear.app' },
  ];

  it('shows every pending site, newest first, in the library', () => {
    expect(toPendingSites(inputs, undefined)).toEqual([
      { id: 'site-2', kind: 'pending-site', domain: 'linear.app' },
      { id: 'site-1', kind: 'pending-site', domain: 'dribbble.com' },
    ]);
  });

  it('shows only the sites going into the open collection', () => {
    expect(toPendingSites(inputs, 'c1')).toEqual([
      { id: 'site-2', kind: 'pending-site', domain: 'linear.app' },
    ]);
  });

  it('falls back to the raw text when the URL cannot be read', () => {
    expect(
      toPendingSites(
        [{ id: 'site-3', collectionId: null, url: 'nope' }],
        undefined,
      ),
    ).toEqual([{ id: 'site-3', kind: 'pending-site', domain: 'nope' }]);
  });
});
