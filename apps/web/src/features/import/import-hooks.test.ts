import { describe, expect, it } from 'vitest';

import type { ImportResult } from './import.type';
import { toImportErrorMessage, toImportMessage } from './import-hooks';

const EMPTY: ImportResult = {
  sourceCount: 0,
  collectionCount: 0,
  existingCount: 0,
  skippedCount: 0,
  failedCount: 0,
  manifestUnreadable: false,
  newSources: [],
};

describe('toImportMessage', () => {
  it('counts sources and collections', () => {
    expect(toImportMessage({ ...EMPTY, sourceCount: 1 })).toBe(
      'Imported 1 source.',
    );
    expect(
      toImportMessage({ ...EMPTY, sourceCount: 12, collectionCount: 3 }),
    ).toBe('Imported 12 sources and 3 collections.');
    expect(toImportMessage({ ...EMPTY, collectionCount: 1 })).toBe(
      'Imported 0 sources and 1 collection.',
    );
  });

  it('says when there was nothing new', () => {
    expect(toImportMessage({ ...EMPTY, existingCount: 5 })).toBe(
      'Nothing new to import. 5 were already in your library.',
    );
    expect(toImportMessage(EMPTY)).toBe('Nothing new to import.');
  });

  it('mentions skipped and failed files', () => {
    expect(
      toImportMessage({
        ...EMPTY,
        sourceCount: 4,
        existingCount: 1,
        skippedCount: 2,
        failedCount: 1,
      }),
    ).toBe(
      'Imported 4 sources. 1 was already in your library. 2 files were skipped. 1 file could not be saved.',
    );
  });

  it('explains a broken library.json', () => {
    expect(
      toImportMessage({ ...EMPTY, sourceCount: 2, manifestUnreadable: true }),
    ).toBe(
      'Imported 2 sources. library.json could not be read, so folders were used instead.',
    );
  });
});

describe('toImportErrorMessage', () => {
  it('explains a full disk', () => {
    expect(
      toImportErrorMessage(
        new Error('Outer', {
          cause: new DOMException('Full', 'QuotaExceededError'),
        }),
      ),
    ).toBe(
      'Not enough space to import this folder. Free some space and try again.',
    );
  });

  it('falls back to a general message', () => {
    expect(toImportErrorMessage(new Error('Boom'))).toBe(
      'Could not import this folder. Please try again.',
    );
  });
});
