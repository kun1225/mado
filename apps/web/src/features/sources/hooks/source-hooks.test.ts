import { describe, expect, it } from 'vitest';

import { toTrashMessage } from './source-hooks';

describe('toTrashMessage', () => {
  it('names a single source', () => {
    expect(toTrashMessage([{ name: 'Sunset' }])).toBe('"Sunset" deleted');
  });

  it('counts several sources', () => {
    expect(toTrashMessage([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe(
      '3 saves deleted',
    );
  });
});
