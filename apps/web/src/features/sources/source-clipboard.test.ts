import { describe, expect, it } from 'vitest';

import { detectPastedContent } from './source-clipboard';

function createClipboardData(
  items: Array<{
    kind: string;
    type: string;
    getAsFile: () => File | null;
  }>,
): DataTransfer {
  return { items } as unknown as DataTransfer;
}

function createFile(name: string, type: string, contents = 'bytes') {
  return new File([contents], name, { type });
}

describe('detectPastedContent', () => {
  it('detects an image', () => {
    const file = createFile('shot.png', 'image/png');
    const data = createClipboardData([
      { kind: 'file', type: 'image/png', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'media', file });
  });

  it('detects a video', () => {
    const file = createFile('clip.mp4', 'video/mp4');
    const data = createClipboardData([
      { kind: 'file', type: 'video/mp4', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'media', file });
  });

  it('uses the file MIME type when the clipboard item type is empty', () => {
    const file = createFile('shot.png', 'image/png');
    const data = createClipboardData([
      { kind: 'file', type: '', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'media', file });
  });

  it('adds a fallback name when the clipboard file has no name', () => {
    const file = createFile('', 'image/png');
    const data = createClipboardData([
      { kind: 'file', type: 'image/png', getAsFile: () => file },
    ]);

    const result = detectPastedContent(data);

    expect(result).toMatchObject({ kind: 'media' });
    expect(result.kind === 'media' && result.file.name).toBe('pasted.png');
  });

  it('uses a clean extension for suffixed MIME types', () => {
    const file = createFile('', 'image/svg+xml');
    const data = createClipboardData([
      { kind: 'file', type: 'image/svg+xml', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toMatchObject({
      file: { name: 'pasted.svg' },
    });
  });

  it('ignores text', () => {
    const data = createClipboardData([
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'ignored' });
  });

  it('ignores unsupported files', () => {
    const file = createFile('document.pdf', 'application/pdf');
    const data = createClipboardData([
      { kind: 'file', type: 'application/pdf', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'ignored' });
  });

  it('ignores empty media files', () => {
    const file = createFile('', 'image/png', '');
    const data = createClipboardData([
      { kind: 'file', type: 'image/png', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'ignored' });
  });

  it('ignores URLs until URL support is implemented', () => {
    const data = createClipboardData([
      { kind: 'string', type: 'text/plain', getAsFile: () => null },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'ignored' });
  });
});
