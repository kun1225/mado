import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  fetchSiteImage,
  isPrivateAddress,
  safeFetch,
  SafeFetchError,
  getFramePolicy,
  getProviderEmbed,
  getSitePreview,
  readHtmlMetadata,
} from './site-preview.js';
import type { SitePreviewFetchedPage } from './site-preview-type.js';

const APP = 'https://mado.app';

function page(
  overrides: Partial<Omit<SitePreviewFetchedPage, 'headers'>> & {
    headers?: Record<string, string>;
  } = {},
) {
  const { headers, ...rest } = overrides;
  return async (): Promise<SitePreviewFetchedPage> => ({
    finalUrl: new URL('https://www.example.com/home'),
    status: 200,
    html: '<title>Example</title><meta property="og:image" content="/og.png">',
    ...rest,
    headers: new Headers({ 'content-type': 'text/html', ...headers }),
  });
}

const preview = (
  url: string,
  fetchPage: () => Promise<SitePreviewFetchedPage>,
) => getSitePreview(new URL(url), { appOrigin: APP, fetchPage });

describe('getSitePreview', () => {
  it('embeds a page whose headers allow it', async () => {
    const result = await preview('https://example.com', page());
    expect(result).toEqual({
      url: 'https://example.com/',
      finalUrl: 'https://www.example.com/home',
      domain: 'example.com',
      title: 'Example',
      description: null,
      favicon: 'https://www.example.com/favicon.ico',
      ogImage: 'https://www.example.com/og.png',
      embed: { mode: 'iframe', src: 'https://www.example.com/home' },
    });
  });

  it.each([
    [{ 'x-frame-options': 'DENY' }, 'x-frame-options'],
    [{ 'content-security-policy': "frame-ancestors 'none'" }, 'csp'],
  ])('does not embed when headers block it', async (headers, reason) => {
    const result = await preview('https://example.com', page({ headers }));
    expect(result.embed).toEqual({ mode: 'none', reason });
    expect(result.title).toBe('Example');
  });

  it('does not embed non-html', async () => {
    const result = await preview(
      'https://example.com/a.pdf',
      page({ html: null, headers: { 'content-type': 'application/pdf' } }),
    );
    expect(result.embed).toEqual({ mode: 'none', reason: 'not-html' });
    expect(result).toMatchObject({ title: null, favicon: null, ogImage: null });
  });

  it('does not embed error pages', async () => {
    const result = await preview('https://example.com', page({ status: 404 }));
    expect(result.embed).toEqual({ mode: 'none', reason: 'fetch-failed' });
  });

  it('uses the provider embed and still reads metadata', async () => {
    const result = await preview(
      'https://youtu.be/dQw4w9WgXcQ',
      page({ headers: { 'x-frame-options': 'DENY' } }),
    );
    expect(result.embed).toEqual({
      mode: 'provider',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    expect(result.title).toBe('Example');
  });

  it('keeps the provider embed when the fetch fails', async () => {
    const result = await preview('https://youtu.be/dQw4w9WgXcQ', async () => {
      throw new SafeFetchError('timeout', 'slow');
    });
    expect(result.embed.mode).toBe('provider');
    expect(result).toMatchObject({ title: null, domain: 'youtu.be' });
  });

  it('reports fetch-failed for other sites', async () => {
    const result = await preview('https://example.com', async () => {
      throw new SafeFetchError('request-failed', 'down');
    });
    expect(result).toMatchObject({
      title: null,
      domain: 'example.com',
      embed: { mode: 'none', reason: 'fetch-failed' },
    });
  });

  it.each(['blocked-address', 'unsupported-protocol'] as const)(
    'rethrows %s so the route can reject the URL',
    async (code) => {
      await expect(
        preview('https://example.com', async () => {
          throw new SafeFetchError(code, 'no');
        }),
      ).rejects.toMatchObject({ code });
    },
  );
});

describe('getProviderEmbed', () => {
  const embed = (url: string) => getProviderEmbed(new URL(url));

  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ'],
  ])('maps YouTube %s', (url) => {
    expect(embed(url)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
  });

  it('maps Vimeo', () => {
    expect(embed('https://vimeo.com/76979871')).toBe(
      'https://player.vimeo.com/video/76979871',
    );
  });

  it('maps Spotify', () => {
    expect(
      embed('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x'),
    ).toBe('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
  });

  it('maps Figma', () => {
    const src = embed(
      'https://www.figma.com/design/abc123/My-File?node-id=1-2',
    );
    expect(src).toBe(
      `https://www.figma.com/embed?embed_host=mado&url=${encodeURIComponent(
        'https://www.figma.com/design/abc123/My-File?node-id=1-2',
      )}`,
    );
  });

  it.each([
    ['https://www.youtube.com/'],
    ['https://www.youtube.com/watch'],
    ['https://www.youtube.com/watch?v=bad id'],
    ['https://vimeo.com/channels/staffpicks'],
    ['https://open.spotify.com/user/someone'],
    ['https://www.figma.com/community'],
    ['https://notyoutube.com/watch?v=dQw4w9WgXcQ'],
    ['https://example.com/'],
  ])('returns null for %s', (url) => {
    expect(embed(url)).toBeNull();
  });
});

describe('getFramePolicy', () => {
  const policy = (headers: Record<string, string>, appOrigin = APP) =>
    getFramePolicy(new Headers(headers), appOrigin);

  it('allows a page with no framing headers', () => {
    expect(policy({})).toEqual({ allowed: true });
  });

  describe('X-Frame-Options', () => {
    it.each(['DENY', 'deny', 'SAMEORIGIN', ' sameorigin '])(
      'blocks %s',
      (value) => {
        expect(policy({ 'x-frame-options': value })).toEqual({
          allowed: false,
          reason: 'x-frame-options',
        });
      },
    );

    it('blocks when any value in a list blocks', () => {
      expect(policy({ 'x-frame-options': 'ALLOW-FROM x, DENY' })).toEqual({
        allowed: false,
        reason: 'x-frame-options',
      });
    });

    it('blocks when the values disagree', () => {
      expect(
        policy({ 'x-frame-options': 'ALLOW-FROM https://x.com, ALLOWALL' }),
      ).toEqual({
        allowed: false,
        reason: 'x-frame-options',
      });
    });

    it('ignores ALLOW-FROM and unknown values, like browsers do', () => {
      expect(policy({ 'x-frame-options': 'ALLOW-FROM https://a.com' })).toEqual(
        { allowed: true },
      );
      expect(policy({ 'x-frame-options': 'whatever' })).toEqual({
        allowed: true,
      });
    });
  });

  describe('CSP frame-ancestors', () => {
    const csp = (value: string, appOrigin = APP, pageProtocol = 'https:') =>
      getFramePolicy(
        new Headers({ 'content-security-policy': value }),
        appOrigin,
        pageProtocol,
      );

    it.each([
      ["frame-ancestors 'none'"],
      ["frame-ancestors 'self'"],
      ['frame-ancestors https://other.com'],
      ['frame-ancestors mado.app:8080'],
      ['frame-ancestors https://*.mado.app'],
      ['frame-ancestors'],
    ])('blocks %s', (value) => {
      expect(csp(value)).toEqual({ allowed: false, reason: 'csp' });
    });

    it.each([
      ['frame-ancestors *'],
      ['frame-ancestors https://mado.app'],
      ['frame-ancestors mado.app'],
      ['frame-ancestors https:'],
      ['frame-ancestors http:'],
      ['frame-ancestors http://mado.app'],
      ['frame-ancestors https://*.app'],
      ["frame-ancestors 'self' https://mado.app"],
      ["default-src 'self'; frame-ancestors https://mado.app; img-src *"],
    ])('allows %s', (value) => {
      expect(csp(value)).toEqual({ allowed: true });
    });

    it('does not match a bare wildcard host to the apex domain', () => {
      expect(csp('frame-ancestors https://*.mado.app')).toEqual({
        allowed: false,
        reason: 'csp',
      });
      expect(
        csp('frame-ancestors https://*.mado.app', 'https://www.mado.app'),
      ).toEqual({ allowed: true });
    });

    it('needs the port when the app origin has a non-default port', () => {
      const dev = 'http://localhost:3000';
      expect(csp('frame-ancestors http://localhost', dev, 'http:')).toEqual({
        allowed: false,
        reason: 'csp',
      });
      expect(
        csp('frame-ancestors http://localhost:3000', dev, 'http:'),
      ).toEqual({
        allowed: true,
      });
      expect(csp('frame-ancestors localhost:*', dev, 'http:')).toEqual({
        allowed: true,
      });
    });

    it('needs a scheme match for sources without a scheme', () => {
      const dev = 'http://localhost:3000';
      const headers = new Headers({
        'content-security-policy': 'frame-ancestors localhost:3000',
      });
      expect(getFramePolicy(headers, dev, 'https:')).toEqual({
        allowed: false,
        reason: 'csp',
      });
      expect(getFramePolicy(headers, dev, 'http:')).toEqual({ allowed: true });
    });

    it('uses the first frame-ancestors when it is repeated', () => {
      expect(csp("frame-ancestors 'none'; frame-ancestors *")).toEqual({
        allowed: false,
        reason: 'csp',
      });
    });

    it('requires every comma-joined policy to allow', () => {
      expect(csp("frame-ancestors *, frame-ancestors 'none'")).toEqual({
        allowed: false,
        reason: 'csp',
      });
      expect(csp("default-src 'self', frame-ancestors *")).toEqual({
        allowed: true,
      });
    });

    it('ignores Report-Only policies', () => {
      expect(
        policy({
          'content-security-policy-report-only': "frame-ancestors 'none'",
        }),
      ).toEqual({ allowed: true });
    });

    it('wins over X-Frame-Options, like browsers do', () => {
      expect(
        policy({
          'content-security-policy': 'frame-ancestors *',
          'x-frame-options': 'DENY',
        }),
      ).toEqual({ allowed: true });
    });

    it('falls back to X-Frame-Options when CSP has no frame-ancestors', () => {
      expect(
        policy({
          'content-security-policy': "default-src 'self'",
          'x-frame-options': 'DENY',
        }),
      ).toEqual({ allowed: false, reason: 'x-frame-options' });
    });
  });
});

describe('readHtmlMetadata', () => {
  const base = new URL('https://example.com/blog/post');

  it('prefers Open Graph values', () => {
    const html = `<html><head>
      <title>Plain title</title>
      <meta name="description" content="Plain description">
      <meta property="og:title" content="OG title">
      <meta property="og:description" content="OG description">
      <meta property="og:image" content="/img/cover.png">
      <link rel="icon" href="/favicon-32.png">
    </head></html>`;
    expect(readHtmlMetadata(html, base)).toEqual({
      title: 'OG title',
      description: 'OG description',
      favicon: 'https://example.com/favicon-32.png',
      ogImage: 'https://example.com/img/cover.png',
    });
  });

  it('falls back to <title>, meta description and twitter tags', () => {
    const html = `<head>
      <title>  Hello
        world </title>
      <meta name="description" content="Desc">
      <meta name="twitter:image" content="https://cdn.example.com/a.jpg">
    </head>`;
    expect(readHtmlMetadata(html, base)).toEqual({
      title: 'Hello world',
      description: 'Desc',
      favicon: 'https://example.com/favicon.ico',
      ogImage: 'https://cdn.example.com/a.jpg',
    });
  });

  it('reads "shortcut icon" and resolves relative links', () => {
    const html = '<link rel="shortcut icon" href="../icon.png">';
    expect(readHtmlMetadata(html, base).favicon).toBe(
      'https://example.com/icon.png',
    );
  });

  it('returns nulls for an empty page', () => {
    expect(readHtmlMetadata('', base)).toEqual({
      title: null,
      description: null,
      favicon: 'https://example.com/favicon.ico',
      ogImage: null,
    });
  });

  it('drops URLs that are not http(s)', () => {
    const html = `<head>
      <meta property="og:image" content="javascript:alert(1)">
      <link rel="icon" href="data:image/png;base64,AAAA">
    </head>`;
    const result = readHtmlMetadata(html, base);
    expect(result.ogImage).toBeNull();
    expect(result.favicon).toBe('https://example.com/favicon.ico');
  });

  it('keeps long text within a limit', () => {
    const html = `<title>${'a'.repeat(1000)}</title>`;
    expect(readHtmlMetadata(html, base).title).toHaveLength(300);
  });
});

describe('isPrivateAddress', () => {
  it.each([
    '0.0.0.0',
    '10.1.2.3',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'fec0::1',
    '64:ff9b::a9fe:a9fe',
    '64:ff9b:1::1',
    '2002:7f00:1::',
    '2001::1',
    '::7f00:1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::ffff:8.8.8.8',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.15.0.1',
    '172.32.0.1',
    '93.184.216.34',
    '2606:4700:4700::1111',
  ])('allows %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe('safeFetch', () => {
  let server: Server;
  let base: string;
  const local = { allowPrivateAddresses: true };

  beforeAll(async () => {
    server = createServer((request, response) => {
      const path = request.url ?? '/';
      if (path === '/html') {
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.setHeader('x-frame-options', 'DENY');
        response.end('<title>Hi é</title>');
      } else if (path === '/gzip') {
        response.setHeader('content-type', 'text/html');
        response.setHeader('content-encoding', 'gzip');
        response.end(gzipSync('<title>Zipped</title>'));
      } else if (path === '/deflate') {
        response.setHeader('content-type', 'text/html');
        response.setHeader('content-encoding', 'deflate');
        response.end(deflateSync('<title>Deflated</title>'));
      } else if (path === '/br') {
        response.setHeader('content-type', 'text/html');
        response.setHeader('content-encoding', 'br');
        response.end(brotliCompressSync('<title>Brotli</title>'));
      } else if (path === '/latin1') {
        response.setHeader('content-type', 'text/html; charset=iso-8859-1');
        response.end(Buffer.from('<title>caf\xe9</title>', 'latin1'));
      } else if (path === '/broken') {
        response.writeHead(200, {
          'content-type': 'text/html',
          'content-length': '500',
        });
        response.write('<title>Partial</title>');
        setTimeout(() => response.destroy(), 20);
      } else if (path === '/pdf') {
        response.setHeader('content-type', 'application/pdf');
        response.end('%PDF');
      } else if (path === '/big') {
        response.setHeader('content-type', 'text/html');
        response.end('a'.repeat(3 * 1024 * 1024));
      } else if (path === '/redirect') {
        response.writeHead(302, { location: '/html' }).end();
      } else if (path === '/loop') {
        response.writeHead(302, { location: '/loop' }).end();
      } else if (path === '/to-ftp') {
        response.writeHead(302, { location: 'ftp://example.com/x' }).end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  it('reads status, headers and html', async () => {
    const page = await safeFetch(new URL(`${base}/html`), local);
    expect(page.status).toBe(200);
    expect(page.headers.get('x-frame-options')).toBe('DENY');
    expect(page.html).toBe('<title>Hi é</title>');
    expect(page.finalUrl.href).toBe(`${base}/html`);
  });

  it('decodes gzip', async () => {
    const page = await safeFetch(new URL(`${base}/gzip`), local);
    expect(page.html).toBe('<title>Zipped</title>');
  });

  it.each([
    ['/deflate', '<title>Deflated</title>'],
    ['/br', '<title>Brotli</title>'],
  ])('decodes %s', async (path, expected) => {
    const page = await safeFetch(new URL(`${base}${path}`), local);
    expect(page.html).toBe(expected);
  });

  it('uses the charset from the Content-Type header', async () => {
    const page = await safeFetch(new URL(`${base}/latin1`), local);
    expect(page.html).toBe('<title>café</title>');
  });

  it('keeps the part of the body it read when the connection breaks', async () => {
    const page = await safeFetch(new URL(`${base}/broken`), local);
    expect(page.status).toBe(200);
    expect(page.html).toBe('<title>Partial</title>');
  });

  it('tries the next address when a host name has several', async () => {
    const port = new URL(base).port;
    const page = await safeFetch(
      new URL(`http://localhost:${port}/html`),
      local,
    );
    expect(page.html).toBe('<title>Hi é</title>');
  });

  it('skips the body when the page is not html', async () => {
    const page = await safeFetch(new URL(`${base}/pdf`), local);
    expect(page.html).toBeNull();
    expect(page.headers.get('content-type')).toBe('application/pdf');
  });

  it('stops reading at the size limit', async () => {
    const page = await safeFetch(new URL(`${base}/big`), local);
    expect(page.html!.length).toBeGreaterThan(0);
    expect(page.html!.length).toBeLessThan(2 * 1024 * 1024);
  });

  it('follows redirects and reports the final URL', async () => {
    const page = await safeFetch(new URL(`${base}/redirect`), local);
    expect(page.finalUrl.href).toBe(`${base}/html`);
    expect(page.html).toBe('<title>Hi é</title>');
  });

  it('gives up after too many redirects', async () => {
    await expect(
      safeFetch(new URL(`${base}/loop`), local),
    ).rejects.toMatchObject({ code: 'too-many-redirects' });
  });

  it('refuses a redirect to another protocol', async () => {
    await expect(
      safeFetch(new URL(`${base}/to-ftp`), local),
    ).rejects.toMatchObject({ code: 'unsupported-protocol' });
  });

  it('times out', async () => {
    await expect(
      safeFetch(new URL(`${base}/hang`), { ...local, timeoutMs: 100 }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('refuses private addresses by default', async () => {
    const error = await safeFetch(new URL(`${base}/html`)).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(SafeFetchError);
    expect(error).toMatchObject({ code: 'blocked-address' });
  });

  it('refuses a host name that points to a private address', async () => {
    const port = new URL(base).port;
    await expect(
      safeFetch(new URL(`http://localhost:${port}/html`)),
    ).rejects.toMatchObject({ code: 'blocked-address' });
  });

  it('refuses an IPv6 loopback literal', async () => {
    await expect(safeFetch(new URL('http://[::1]/'))).rejects.toMatchObject({
      code: 'blocked-address',
    });
  });

  it('refuses other protocols', async () => {
    await expect(
      safeFetch(new URL('ftp://example.com/')),
    ).rejects.toMatchObject({ code: 'unsupported-protocol' });
  });
});

describe('fetchSiteImage', () => {
  let server: Server;
  let base: string;
  const local = { allowPrivateAddresses: true };

  beforeAll(async () => {
    server = createServer((request, response) => {
      const path = request.url ?? '/';
      if (path === '/image') {
        response.setHeader('content-type', 'image/png');
        response.end('png-bytes');
      } else if (path === '/redirect') {
        response.writeHead(302, { location: '/image' }).end();
      } else if (path === '/svg') {
        response.setHeader('content-type', 'image/svg+xml');
        response.end('<svg></svg>');
      } else if (path === '/html') {
        response.setHeader('content-type', 'text/html');
        response.end('<title>Not an image</title>');
      } else if (path === '/missing') {
        response.writeHead(404, { 'content-type': 'image/png' }).end('nope');
      } else if (path === '/big') {
        response.setHeader('content-type', 'image/png');
        response.end(Buffer.alloc(6 * 1024 * 1024));
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  it('returns the image type and bytes', async () => {
    const image = await fetchSiteImage(new URL(`${base}/image`), local);
    expect(image.type).toBe('image/png');
    expect(image.body.toString()).toBe('png-bytes');
  });

  it('follows redirects', async () => {
    const image = await fetchSiteImage(new URL(`${base}/redirect`), local);
    expect(image.body.toString()).toBe('png-bytes');
  });

  it.each(['/svg', '/html', '/missing'])('rejects %s', async (path) => {
    await expect(
      fetchSiteImage(new URL(`${base}${path}`), local),
    ).rejects.toThrow('Not a usable image');
  });

  it('rejects an image over the size limit', async () => {
    await expect(fetchSiteImage(new URL(`${base}/big`), local)).rejects.toThrow(
      'Image is too large',
    );
  });

  it('refuses private addresses by default', async () => {
    await expect(
      fetchSiteImage(new URL(`${base}/image`)),
    ).rejects.toMatchObject({ code: 'blocked-address' });
  });
});
