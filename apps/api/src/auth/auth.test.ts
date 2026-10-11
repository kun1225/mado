import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createApp } from '../app.js';

import { createAuth, readAuthConfig } from './auth.js';
import * as schema from './auth.model.js';
import type { AuthConfig } from './auth.type.js';

const config: AuthConfig = {
  databaseUrl: 'postgresql://unused',
  secret: 'test-only-secret-with-at-least-32-characters',
  baseUrl: 'http://localhost:3100',
  webOrigin: 'http://localhost:3100',
  production: false,
  smtp: {
    host: 'localhost',
    port: 1025,
    secure: false,
    from: 'hello@mado.local',
  },
};
const password = 'a long test password';
const emails: { to: string; text: string }[] = [];
const sendMail = vi.fn(async (message: { to: string; text: string }) => {
  emails.push(message);
  return {};
});

let postgres: PGlite;
let server: Server;
let origin: string;
let auth: ReturnType<typeof createAuth>;

beforeAll(async () => {
  postgres = new PGlite();
  const database = drizzle(postgres, { schema });
  await migrate(database, {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
  });
  auth = createAuth({ database, config, mailer: { sendMail } });
  server = createApp(auth).listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 30_000);

beforeEach(async () => {
  await postgres.exec('TRUNCATE "rate_limit"');
  sendMail.mockClear();
  emails.length = 0;
});

afterAll(async () => {
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await postgres?.close();
});

async function post(
  path: string,
  body: unknown = {},
  cookie?: string,
  requestOrigin = config.webOrigin,
) {
  return fetch(`${origin}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: requestOrigin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}

function emailLink(email: string) {
  const message = [...emails].reverse().find((entry) => entry.to === email);
  if (!message) throw new Error('Expected an auth email');
  return new URL(message.text.split('\n\n')[1]!);
}

async function verifiedAccount(email: string) {
  const result = await post('sign-up/email', {
    name: 'Mado User',
    email,
    password,
    callbackURL: `${config.webOrigin}/verify-email?verified=true`,
  });
  expect(result.status).toBe(200);
  const link = emailLink(email);
  const verification = await fetch(`${origin}${link.pathname}${link.search}`, {
    redirect: 'manual',
  });
  expect(verification.status).toBe(302);
  const login = await post('sign-in/email', { email, password });
  expect(login.status).toBe(200);
  const cookie = login.headers
    .getSetCookie()
    .find((value) => value.startsWith('better-auth.session_token='))
    ?.split(';')[0];
  expect(cookie).toBeTruthy();
  return cookie!;
}

describe('authentication integration', () => {
  it('requires email verification, creates a cookie session, and revokes it on sign-out', async () => {
    const email = 'flow@example.com';
    const signup = await post('sign-up/email', {
      name: 'Test User',
      email,
      password,
      callbackURL: `${config.webOrigin}/verify-email?verified=true`,
    });
    expect(signup.status).toBe(200);
    expect(signup.headers.get('set-cookie')).toBeNull();
    const stored = await postgres.query<{ password: string }>(
      'SELECT password FROM account',
    );
    expect(stored.rows[0]?.password).not.toBe(password);
    expect((await post('sign-in/email', { email, password })).status).toBe(403);
    expect((await fetch(`${origin}/api/me`)).status).toBe(401);
    const link = emailLink(email);
    const verification = await fetch(
      `${origin}${link.pathname}${link.search}`,
      { redirect: 'manual' },
    );
    expect(verification.status).toBe(302);
    expect(verification.headers.get('location')).toBe(
      `${config.webOrigin}/verify-email?verified=true`,
    );
    expect(
      (await post('sign-in/email', { email, password: 'wrong password' }))
        .status,
    ).toBe(401);
    const login = await post('sign-in/email', { email, password });
    expect(login.status).toBe(200);
    const sessionCookie = login.headers
      .getSetCookie()
      .find((value) => value.startsWith('better-auth.session_token='));
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Lax');
    const cookie = sessionCookie!.split(';')[0]!;
    const me = await fetch(`${origin}/api/me`, { headers: { cookie } });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({
      user: {
        id: expect.any(String),
        name: 'Test User',
        email,
        emailVerified: true,
        image: null,
      },
    });
    expect((await post('sign-out', {}, cookie)).status).toBe(200);
    expect(
      (await fetch(`${origin}/api/me`, { headers: { cookie } })).status,
    ).toBe(401);
  });

  it('resets a password once and revokes old sessions', async () => {
    const email = 'reset@example.com';
    const cookie = await verifiedAccount(email);
    const reset = await post('request-password-reset', {
      email,
      redirectTo: `${config.webOrigin}/reset-password`,
    });
    expect(reset.status).toBe(200);
    const link = emailLink(email);
    const callback = await fetch(`${origin}${link.pathname}${link.search}`, {
      redirect: 'manual',
    });
    const destination = new URL(callback.headers.get('location')!);
    expect(destination.pathname).toBe('/reset-password');
    const token = destination.searchParams.get('token');
    const newPassword = 'a different long password';
    expect((await post('reset-password', { token, newPassword })).status).toBe(
      200,
    );
    expect((await post('reset-password', { token, newPassword })).status).toBe(
      400,
    );
    expect(
      (await fetch(`${origin}/api/me`, { headers: { cookie } })).status,
    ).toBe(401);
    expect((await post('sign-in/email', { email, password })).status).toBe(401);
    expect(
      (await post('sign-in/email', { email, password: newPassword })).status,
    ).toBe(200);
  });

  it('rejects expired sessions and reset links', async () => {
    const email = 'expired@example.com';
    const cookie = await verifiedAccount(email);
    await postgres.exec(`UPDATE session SET expires_at = '2000-01-01'`);
    expect(
      (await fetch(`${origin}/api/me`, { headers: { cookie } })).status,
    ).toBe(401);
    await post('request-password-reset', {
      email,
      redirectTo: `${config.webOrigin}/reset-password`,
    });
    const link = emailLink(email);
    const token = link.pathname.split('/').at(-1);
    await postgres.exec(`UPDATE verification SET expires_at = '2000-01-01'`);
    expect(
      (
        await post('reset-password', {
          token,
          newPassword: 'another long password',
        })
      ).status,
    ).toBe(400);
  });

  it('does not expose whether an account exists in sign-up or password-reset responses', async () => {
    const email = 'private@example.com';
    const first = await post('sign-up/email', {
      name: 'Private',
      email,
      password,
    });
    const duplicate = await post('sign-up/email', {
      name: 'Private',
      email,
      password,
    });
    expect(duplicate.status).toBe(first.status);
    const existing = await post('request-password-reset', {
      email,
      redirectTo: `${config.webOrigin}/reset-password`,
    });
    const missing = await post('request-password-reset', {
      email: 'missing@example.com',
      redirectTo: `${config.webOrigin}/reset-password`,
    });
    expect(missing.status).toBe(existing.status);
    expect(await missing.json()).toEqual(await existing.json());
  });

  it('blocks untrusted origins, redirects, and short passwords', async () => {
    expect(
      (
        await post('sign-up/email', {
          name: 'User',
          email: 'short@example.com',
          password: 'short',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await post(
          'sign-in/email',
          { email: 'x@example.com', password },
          undefined,
          'https://evil.example',
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await post('request-password-reset', {
          email: 'x@example.com',
          redirectTo: 'https://evil.example',
        })
      ).status,
    ).toBe(403);
  });

  it('limits repeated sign-in attempts even when the client spoofs the internal IP header', async () => {
    let result: Response | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      result = await fetch(`${origin}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: config.webOrigin,
          'x-mado-client-ip': `192.0.2.${attempt}`,
        },
        body: JSON.stringify({ email: 'missing@example.com', password }),
      });
    }
    expect(result!.status).toBe(429);
    expect(result!.headers.get('x-retry-after')).toBeTruthy();
  });

  it('uses secure session cookies in production', async () => {
    const email = 'secure@example.com';
    await verifiedAccount(email);
    const productionAuth = createAuth({
      database: drizzle(postgres, { schema }),
      config: {
        ...config,
        production: true,
        baseUrl: 'https://mado.example',
        webOrigin: 'https://mado.example',
      },
      mailer: { sendMail },
    });
    const result = await productionAuth.handler(
      new Request('https://mado.example/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://mado.example',
          'x-mado-client-ip': '192.0.2.100',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }),
    );
    expect(result.status).toBe(200);
    expect(result.headers.get('set-cookie')).toContain('Secure');
    expect(result.headers.get('set-cookie')).toContain(
      '__Secure-better-auth.session_token',
    );
  });
});

describe('auth configuration', () => {
  it('reports missing fields without exposing secrets', () => {
    expect(() =>
      readAuthConfig({ BETTER_AUTH_SECRET: 'do-not-print-me' }),
    ).toThrow('Invalid auth configuration:');
    expect(() =>
      readAuthConfig({ BETTER_AUTH_SECRET: 'do-not-print-me' }),
    ).not.toThrow('do-not-print-me');
  });

  it('requires HTTPS in production', () => {
    expect(() =>
      readAuthConfig({
        NODE_ENV: 'production',
        DATABASE_URL: config.databaseUrl,
        BETTER_AUTH_SECRET: config.secret,
        BETTER_AUTH_URL: config.baseUrl,
        WEB_ORIGIN: config.webOrigin,
        SMTP_HOST: 'localhost',
        SMTP_FROM: 'hello@mado.local',
      }),
    ).toThrow('HTTPS');
  });
});
