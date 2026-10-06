import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  compressMedia,
  detectPastedContent,
  fetchSiteCapture,
  fetchSitePreview,
  fitWithin,
} from './source-media';

afterEach(() => vi.unstubAllGlobals());

describe('site API helpers', () => {
  it('posts a URL and returns preview metadata', async () => {
    const preview = { title: 'Example', finalUrl: 'https://example.com/' };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(preview), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchSitePreview('https://example.com')).toEqual(preview);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sites/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      }),
    );
  });

  it('returns a WebP file from the capture response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['image'], { type: 'image/webp' }), {
          headers: { 'content-type': 'image/webp' },
        }),
      ),
    );

    const file = await fetchSiteCapture('https://example.com');
    expect(file.name).toBe('website.webp');
    expect(file.type).toBe('image/webp');
  });

  it('rejects failed captures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 502 })),
    );

    await expect(fetchSiteCapture('https://example.com')).rejects.toThrow(
      'Could not capture this website.',
    );
  });
});

function createClipboardData(
  items: Array<{
    kind: string;
    type: string;
    getAsFile: () => File | null;
  }>,
  text = '',
): DataTransfer {
  return { items, getData: () => text } as unknown as DataTransfer;
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

  it('detects a pasted website URL', () => {
    const data = createClipboardData(
      [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
      ' https://example.com/page ',
    );

    expect(detectPastedContent(data)).toEqual({
      kind: 'url',
      url: 'https://example.com/page',
    });
  });

  it.each(['hello', 'file:///etc/passwd', 'https://user:pass@example.com'])(
    'ignores invalid website text %s',
    (text) => {
      expect(detectPastedContent(createClipboardData([], text))).toEqual({
        kind: 'ignored',
      });
    },
  );
});

describe('fitWithin', () => {
  it('keeps a size that already fits', () => {
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 });
  });

  it('scales a landscape size down by its long side', () => {
    expect(fitWithin(3840, 2160, 1920)).toEqual({ width: 1920, height: 1080 });
  });

  it('scales a portrait size down by its long side', () => {
    expect(fitWithin(2160, 3840, 1920)).toEqual({ width: 1080, height: 1920 });
  });

  it('rounds to even numbers', () => {
    const { width, height } = fitWithin(3001, 1999, 1500);

    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });
});

describe('compressMedia', () => {
  it('returns the original for a GIF', async () => {
    const file = createFile('a.gif', 'image/gif');

    expect(await compressMedia(file)).toBe(file);
  });

  it('returns the original when compression is not possible', async () => {
    // The test environment has no OffscreenCanvas or WebCodecs.
    const file = createFile('a.png', 'image/png');

    expect(await compressMedia(file)).toBe(file);
  });
});
