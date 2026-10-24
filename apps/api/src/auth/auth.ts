import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import nodemailer from 'nodemailer';
import { z } from 'zod';

import * as schema from './auth.model.js';
import type { AuthConfig, AuthDependencies } from './auth.type.js';

export function createAuth({ database, config, mailer }: AuthDependencies) {
  const transport =
    mailer ??
    nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      ...(config.smtp.user && {
        auth: { user: config.smtp.user, pass: config.smtp.password },
      }),
    });

  return betterAuth({
    appName: 'Mado',
    secret: config.secret,
    baseURL: config.baseUrl,
    trustedOrigins: [config.webOrigin],
    database: drizzleAdapter(database, {
      provider: 'pg',
      schema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        sendAuthEmail(transport, {
          from: config.smtp.from,
          to: user.email,
          url,
          action: 'Reset your password',
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: ({ user, url }) =>
        sendAuthEmail(transport, {
          from: config.smtp.from,
          to: user.email,
          url,
          action: 'Verify your email',
        }),
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 3 },
        '/send-verification-email': { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: config.production,
      disableOriginCheck: false,
      disableCSRFCheck: false,
      ipAddress: { ipAddressHeaders: ['x-mado-client-ip'] },
    },
  });
}

// *** sendAuthEmail ***
async function sendAuthEmail(
  transport: NonNullable<AuthDependencies['mailer']>,
  email: { from: string; to: string; url: string; action: string },
) {
  await transport.sendMail({
    from: email.from,
    to: email.to,
    subject: `${email.action} — Mado`,
    text: `${email.action} by opening this link:\n\n${email.url}\n\nIf you did not request this, you can ignore this email.`,
  });
}

// *** readAuthConfig ***
export function readAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const values = z
    .object({
      NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
      DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.url(),
      WEB_ORIGIN: z.url(),
      SMTP_HOST: z.string().min(1),
      SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
      SMTP_SECURE: z.enum(['true', 'false']).default('false'),
      SMTP_USER: z.string().optional(),
      SMTP_PASSWORD: z.string().optional(),
      SMTP_FROM: z.email(),
    })
    .safeParse(env);

  if (!values.success) {
    const fields = values.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Invalid auth configuration: ${fields}`);
  }

  const value = values.data;
  for (const name of ['BETTER_AUTH_URL', 'WEB_ORIGIN'] as const) {
    const url = new URL(value[name]);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.origin !== value[name]
    ) {
      throw new Error(
        `${name} must be an HTTP origin without a path or trailing slash.`,
      );
    }
    if (value.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error(`${name} must use HTTPS in production.`);
    }
  }
  if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASSWORD)) {
    throw new Error('Set both SMTP_USER and SMTP_PASSWORD, or neither.');
  }

  return {
    databaseUrl: value.DATABASE_URL,
    secret: value.BETTER_AUTH_SECRET,
    baseUrl: value.BETTER_AUTH_URL,
    webOrigin: value.WEB_ORIGIN,
    production: value.NODE_ENV === 'production',
    smtp: {
      host: value.SMTP_HOST,
      port: value.SMTP_PORT,
      secure: value.SMTP_SECURE === 'true',
      user: value.SMTP_USER,
      password: value.SMTP_PASSWORD,
      from: value.SMTP_FROM,
    },
  };
}
