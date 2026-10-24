import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import {
  afterAll,
  afterEach,
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

const google = {
  clientId: 'test-google-client-id',
  clientSecret: 'test-google-client-secret',
};
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
  google,
  emailPassword: true,
};
const googleOnlyConfig: AuthConfig = { ...config, emailPassword: false };
const googleCallbackURL = `${config.webOrigin}/collection/abc?view=grid`;
const googleErrorURL = `${googleCallbackURL}&settings=account`;
const EMAIL_ONLY_TEST_PATHS = [
  'request-password-reset',
  'reset-password',
  'send-verification-email',
];
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
  server = createApp({ auth, webOrigin: config.webOrigin }).listen(0);
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
    callbackURL: `${config.webOrigin}/library?settings=account&verified=true`,
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
      callbackURL: `${config.webOrigin}/library?settings=account&verified=true`,
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
      `${config.webOrigin}/library?settings=account&verified=true`,
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
      redirectTo: `${config.webOrigin}/library?settings=account&auth=reset-password`,
    });
    expect(reset.status).toBe(200);
    const link = emailLink(email);
    const callback = await fetch(`${origin}${link.pathname}${link.search}`, {
      redirect: 'manual',
    });
    const destination = new URL(callback.headers.get('location')!);
    expect(destination.pathname).toBe('/library');
    expect(destination.searchParams.get('settings')).toBe('account');
    expect(destination.searchParams.get('auth')).toBe('reset-password');
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
      redirectTo: `${config.webOrigin}/library?settings=account&auth=reset-password`,
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
      redirectTo: `${config.webOrigin}/library?settings=account&auth=reset-password`,
    });
    const missing = await post('request-password-reset', {
      email: 'missing@example.com',
      redirectTo: `${config.webOrigin}/library?settings=account&auth=reset-password`,
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

describe('google sign-in with email paused', () => {
  let googleAuth: ReturnType<typeof createAuth>;

  beforeAll(() => {
    googleAuth = createAuth({
      database: drizzle(postgres, { schema }),
      config: googleOnlyConfig,
      mailer: { sendMail },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  // *** googleRequest ***
  function googleRequest(path: string, init: RequestInit = {}) {
    return googleAuth.handler(
      new Request(`${config.baseUrl}/api/auth/${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          origin: config.webOrigin,
          'x-mado-client-ip': '192.0.2.200',
          ...init.headers,
        },
      }),
    );
  }

  // *** startGoogleSignIn ***
  async function startGoogleSignIn() {
    const result = await googleRequest('sign-in/social', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'google',
        callbackURL: googleCallbackURL,
        errorCallbackURL: googleErrorURL,
      }),
    });
    expect(result.status).toBe(200);
    const { url } = (await result.json()) as { url: string };
    const authorization = new URL(url);
    return {
      authorization,
      state: authorization.searchParams.get('state')!,
      cookie: cookieHeader(result),
    };
  }

  // *** finishGoogleSignIn ***
  async function finishGoogleSignIn(profile: GoogleTestProfile) {
    const { state, cookie } = await startGoogleSignIn();
    mockGoogleToken(profile);
    return googleRequest(
      `callback/google?code=test-code&state=${encodeURIComponent(state)}`,
      { headers: { cookie } },
    );
  }

  // *** sessionUser ***
  async function sessionUser(callback: Response) {
    const session = await googleRequest('get-session', {
      headers: { cookie: cookieHeader(callback) },
    });
    return ((await session.json()) as { user: { id: string } } | null)?.user;
  }

  it('asks Google for account selection and basic identity only', async () => {
    const { authorization } = await startGoogleSignIn();
    expect(authorization.origin).toBe('https://accounts.google.com');
    expect(authorization.searchParams.get('prompt')).toBe('select_account');
    expect(authorization.searchParams.get('scope')?.split(' ').sort()).toEqual([
      'email',
      'openid',
      'profile',
    ]);
    expect(authorization.searchParams.get('redirect_uri')).toBe(
      `${config.baseUrl}/api/auth/callback/google`,
    );
  });

  it('creates a user for a new Google account and returns to the same page', async () => {
    const callback = await finishGoogleSignIn({
      sub: 'google-new',
      email: 'new-google@example.com',
      emailVerified: true,
    });
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toBe(googleCallbackURL);
    expect(await sessionUser(callback)).toMatchObject({
      email: 'new-google@example.com',
    });
  });

  it('keeps the same user when a verified email user signs in with Google', async () => {
    const email = 'linked@example.com';
    await verifiedAccount(email);
    const before = await postgres.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1',
      [email],
    );
    const callback = await finishGoogleSignIn({
      sub: 'google-linked',
      email,
      emailVerified: true,
    });
    expect(callback.headers.get('location')).toBe(googleCallbackURL);
    expect((await sessionUser(callback))?.id).toBe(before.rows[0]?.id);
  });

  it('does not link Google to an unverified email user', async () => {
    const email = 'unverified@example.com';
    await post('sign-up/email', { name: 'Unverified', email, password });
    const callback = await finishGoogleSignIn({
      sub: 'google-unverified',
      email,
      emailVerified: true,
    });
    const location = new URL(callback.headers.get('location')!);
    expect(location.searchParams.get('error')).toBe('account_not_linked');
    expect(location.searchParams.get('settings')).toBe('account');
    expect(callback.headers.get('set-cookie') ?? '').not.toContain(
      'session_token=',
    );
  });

  it('sends a canceled sign-in back to the account panel on the same page', async () => {
    const { state, cookie } = await startGoogleSignIn();
    const callback = await googleRequest(
      `callback/google?error=access_denied&state=${encodeURIComponent(state)}`,
      { headers: { cookie } },
    );
    const location = new URL(callback.headers.get('location')!);
    expect(`${location.origin}${location.pathname}`).toBe(
      `${config.webOrigin}/collection/abc`,
    );
    expect(location.searchParams.get('error')).toBe('access_denied');
  });

  it('sends a bad state to the account panel instead of an API error page', async () => {
    const callback = await googleRequest(
      'callback/google?code=test-code&state=not-a-real-state',
    );
    const location = new URL(callback.headers.get('location')!);
    expect(`${location.origin}${location.pathname}`).toBe(
      `${config.webOrigin}/library`,
    );
    expect(location.searchParams.get('settings')).toBe('account');
    expect(location.searchParams.get('error')).toBeTruthy();
  });

  it('rejects email sign-in and sign-up', async () => {
    const body = JSON.stringify({
      name: 'User',
      email: 'off@example.com',
      password,
    });
    for (const path of ['sign-in/email', 'sign-up/email']) {
      const result = await googleRequest(path, { method: 'POST', body });
      expect(result.status).toBeGreaterThanOrEqual(400);
    }
  });

  it.each(EMAIL_ONLY_TEST_PATHS)(
    'hides %s so it cannot send emails',
    async (path) => {
      const result = await googleRequest(path, {
        method: 'POST',
        body: JSON.stringify({
          email: 'linked@example.com',
          redirectTo: `${config.webOrigin}/library`,
        }),
      });
      expect(result.status).toBe(404);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  it('limits repeated Google sign-in starts', async () => {
    let result: Response | undefined;
    for (let attempt = 0; attempt < 11; attempt++) {
      result = await googleRequest('sign-in/social', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          callbackURL: googleCallbackURL,
        }),
      });
    }
    expect(result!.status).toBe(429);
  });
});

describe('google sign-in turned off', () => {
  it('rejects a Google sign-in start', async () => {
    const offAuth = createAuth({
      database: drizzle(postgres, { schema }),
      config: { ...googleOnlyConfig, google: null },
      mailer: { sendMail },
    });
    const result = await offAuth.handler(
      new Request(`${config.baseUrl}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: config.webOrigin,
          'x-mado-client-ip': '192.0.2.201',
        },
        body: JSON.stringify({
          provider: 'google',
          callbackURL: googleCallbackURL,
        }),
      }),
    );
    expect(result.status).toBeGreaterThanOrEqual(400);
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
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret',
      }),
    ).toThrow('HTTPS');
  });

  it('requires Google credentials without printing them', () => {
    const env = { ...validEnv(), GOOGLE_CLIENT_SECRET: undefined };
    expect(() => readAuthConfig(env)).toThrow('GOOGLE_CLIENT_SECRET');
    expect(() => readAuthConfig(env)).not.toThrow('do-not-print-me');
  });

  it('does not need Google credentials when Google is turned off', () => {
    const env = {
      ...validEnv(),
      FLAG_AUTH_GOOGLE: 'false',
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
    };
    expect(readAuthConfig(env).google).toBeNull();
  });

  it('keeps email and password off unless it is turned on', () => {
    expect(readAuthConfig(validEnv()).emailPassword).toBe(false);
    expect(
      readAuthConfig({ ...validEnv(), FLAG_AUTH_EMAIL_PASSWORD: 'true' })
        .emailPassword,
    ).toBe(true);
    expect(() =>
      readAuthConfig({ ...validEnv(), FLAG_AUTH_EMAIL_PASSWORD: 'yes' }),
    ).toThrow('FLAG_AUTH_EMAIL_PASSWORD');
  });
});

// *** validEnv ***
function validEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://mado:mado@localhost:5432/mado',
    BETTER_AUTH_SECRET: config.secret,
    BETTER_AUTH_URL: config.baseUrl,
    WEB_ORIGIN: config.webOrigin,
    SMTP_HOST: 'localhost',
    SMTP_FROM: 'hello@mado.local',
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'do-not-print-me',
  };
}

// *** cookieHeader ***
function cookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
}

// *** mockGoogleToken ***
// Only Google's token endpoint is faked, so the real Better Auth callback runs.
function mockGoogleToken(profile: GoogleTestProfile) {
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith('https://oauth2.googleapis.com/token'))
      return realFetch(input, init);
    return Response.json({
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid email profile',
      id_token: googleIdToken(profile),
    });
  });
}

// *** googleIdToken ***
function googleIdToken({ sub, email, emailVerified }: GoogleTestProfile) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'https://accounts.google.com',
    aud: google.clientId,
    sub,
    email,
    email_verified: emailVerified,
    name: 'Google User',
    iat: now,
    exp: now + 3600,
  };
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(claims)}.signature`;
}

type GoogleTestProfile = { sub: string; email: string; emailVerified: boolean };
