import type { DB } from '@better-auth/drizzle-adapter';

import type { createAuth } from './auth.js';

export type AuthInstance = ReturnType<typeof createAuth>;

export type AuthConfig = {
  databaseUrl: string;
  secret: string;
  baseUrl: string;
  webOrigin: string;
  production: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
  };
};

export type AuthDependencies = {
  database: DB;
  config: AuthConfig;
  mailer?: {
    sendMail: (message: {
      from: string;
      to: string;
      subject: string;
      text: string;
    }) => Promise<unknown>;
  };
};

export type AuthLocals = {
  auth: NonNullable<Awaited<ReturnType<AuthInstance['api']['getSession']>>>;
};
