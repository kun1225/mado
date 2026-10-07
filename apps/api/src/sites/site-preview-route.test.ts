import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';

describe('POST /api/v1/sites/preview', () => {
  let server: Server;
  let endpoint: string;

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/sites/preview`;
  });

  afterAll(() => {
    server.close();
  });

  const post = (body: unknown) =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it.each([
    {},
    { url: 42 },
    { url: 'not a url' },
    { url: 'ftp://example.com' },
    { url: 'javascript:alert(1)' },
  ])('rejects invalid input %j', async (body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid-url' });
  });

  it('rejects a URL with a user name or password', async () => {
    const response = await post({ url: 'https://user:pass@example.com/' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid-url' });
  });

  it('rejects broken JSON without a stack trace', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"url":',
    });
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).not.toContain('at ');
    expect(JSON.parse(text)).toMatchObject({ error: 'invalid-json' });
  });

  it('rejects a private address', async () => {
    const response = await post({ url: 'http://127.0.0.1:9/' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'url-not-allowed' });
  });

  it('rejects a URL that is too long', async () => {
    const response = await post({
      url: `https://example.com/${'a'.repeat(2100)}`,
    });
    expect(response.status).toBe(400);
  });
});

describe('POST /api/v1/sites/image', () => {
  let server: Server;
  let endpoint: string;

  beforeAll(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/sites/image`;
  });

  afterAll(() => {
    server.close();
  });

  it('rejects invalid URLs', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'file:///etc/passwd' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid-url' });
  });

  it('rejects private addresses', async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:9/' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'url-not-allowed' });
  });
});
