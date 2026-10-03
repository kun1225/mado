import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  isPrivateAddress,
  safeFetch,
  SafeFetchError,
} from './site-preview-safe-fetch.js';

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
        // Promises more than it sends, then drops the connection.
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
      // '/hang' never answers.
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
    // "localhost" often lists ::1 before 127.0.0.1, but this server is IPv4 only.
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
    ).rejects.toMatchObject({
      code: 'too-many-redirects',
    });
  });

  it('refuses a redirect to another protocol', async () => {
    await expect(
      safeFetch(new URL(`${base}/to-ftp`), local),
    ).rejects.toMatchObject({
      code: 'unsupported-protocol',
    });
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
    ).rejects.toMatchObject({
      code: 'blocked-address',
    });
  });

  it('refuses an IPv6 loopback literal', async () => {
    await expect(safeFetch(new URL('http://[::1]/'))).rejects.toMatchObject({
      code: 'blocked-address',
    });
  });

  it('refuses other protocols', async () => {
    await expect(
      safeFetch(new URL('ftp://example.com/')),
    ).rejects.toMatchObject({
      code: 'unsupported-protocol',
    });
  });
});
