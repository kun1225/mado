import { describe, expect, it } from 'vitest';

import { toExportErrorMessage, toExportMessage } from './export-hooks';

describe('toExportMessage', () => {
  it('counts the sources', () => {
    expect(toExportMessage({ sourceCount: 1, missingCount: 0 })).toBe(
      'Exported 1 source.',
    );
    expect(toExportMessage({ sourceCount: 121, missingCount: 0 })).toBe(
      'Exported 121 sources.',
    );
  });

  it('mentions missing files', () => {
    expect(toExportMessage({ sourceCount: 5, missingCount: 1 })).toBe(
      'Exported 5 sources. 1 file was missing.',
    );
    expect(toExportMessage({ sourceCount: 5, missingCount: 2 })).toBe(
      'Exported 5 sources. 2 files were missing.',
    );
  });
});

describe('toExportErrorMessage', () => {
  it('stays quiet when the user closes the picker', () => {
    expect(
      toExportErrorMessage(new DOMException('Closed', 'AbortError')),
    ).toBeNull();
  });

  it('explains a full disk', () => {
    expect(
      toExportErrorMessage(new DOMException('Full', 'QuotaExceededError')),
    ).toBe('Not enough space to build the zip. Free some space and try again.');
  });

  it('explains a blocked save', () => {
    expect(
      toExportErrorMessage(new DOMException('No', 'NotAllowedError')),
    ).toBe(
      'The browser did not allow saving the file. Try again and pick another folder.',
    );
  });

  it('falls back for anything else', () => {
    expect(toExportErrorMessage(new Error('boom'))).toBe(
      'Could not export your library. Please try again.',
    );
    expect(toExportErrorMessage('boom')).toBe(
      'Could not export your library. Please try again.',
    );
  });
});
