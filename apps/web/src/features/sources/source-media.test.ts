import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  compressMedia,
  detectPastedContent,
  downloadSiteVideo,
  fetchSiteImage,
  fetchSitePreview,
  fitWithin,
} from './source-media';

afterEach(() => vi.unstubAllGlobals());

describe('site API helpers', () => {
  it('downloads a post video straight from X', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(new Blob(['video'], { type: 'video/mp4' })),
      );
    vi.stubGlobal('fetch', fetchMock);

    const file = await downloadSiteVideo('https://video.twimg.com/a.mp4');

    expect(fetchMock).toHaveBeenCalledWith('https://video.twimg.com/a.mp4', {
      referrerPolicy: 'no-referrer',
    });
    expect(file.name).toBe('video.mp4');
    expect(file.type).toBe('video/mp4');
  });

  it('refuses a video from another host', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      downloadSiteVideo('https://example.com/a.mp4'),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    new Response(null, { status: 404 }),
    new Response(new Blob(['<html>'], { type: 'text/html' })),
  ])('rejects a response that is not a video', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(
      downloadSiteVideo('https://video.twimg.com/a.mp4'),
    ).rejects.toThrow();
  });

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

  it('explains that the server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(fetchSitePreview('https://example.com')).rejects.toThrow(
      'Could not reach the Mado server. Check your internet and try again.',
    );
  });

  it.each([
    [
      'invalid-url',
      'This link is not valid. Copy the full address, starting with http:// or https://.',
    ],
    [
      'url-not-allowed',
      'This link points to a private or local address, so it cannot be saved.',
    ],
    [
      'internal',
      'Could not load this website. It may be down or blocking previews.',
    ],
  ])('explains the %s API error', async (code, message) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: code }), { status: 400 }),
        ),
    );

    await expect(fetchSitePreview('https://example.com')).rejects.toThrow(
      message,
    );
  });

  it('falls back when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })),
    );

    await expect(fetchSitePreview('https://example.com')).rejects.toThrow(
      'Could not load this website. It may be down or blocking previews.',
    );
  });

  it('returns the downloaded image as a file', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Blob(['image'], { type: 'image/png' }), {
        headers: { 'content-type': 'image/png' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const file = await fetchSiteImage('https://example.com/og.png');
    expect(file.name).toBe('og-image.png');
    expect(file.type).toBe('image/png');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/sites/image',
      expect.objectContaining({
        body: JSON.stringify({ url: 'https://example.com/og.png' }),
      }),
    );
  });

  it('rejects a failed download', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 502 })),
    );

    await expect(fetchSiteImage('https://example.com/og.png')).rejects.toThrow(
      'Could not download the website image.',
    );
  });

  it('rejects a response that is not an image', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<html>', { headers: { 'content-type': 'text/html' } }),
        ),
    );

    await expect(fetchSiteImage('https://example.com/og.png')).rejects.toThrow(
      'Invalid website image.',
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

  it('detects a Markdown file with no type', () => {
    const file = createFile('brief.md', '');
    const data = createClipboardData([
      { kind: 'file', type: '', getAsFile: () => file },
    ]);

    expect(detectPastedContent(data)).toEqual({ kind: 'media', file });
  });

  it('ignores an HTML file', () => {
    const file = createFile('page.html', 'text/html');
    const data = createClipboardData([
      { kind: 'file', type: 'text/html', getAsFile: () => file },
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
