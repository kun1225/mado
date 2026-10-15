import cors from 'cors';
import express, { type Express } from 'express';

import { createAuthRouter } from './auth/auth.route.js';
import type { AuthInstance } from './auth/auth.type.js';
import { createSitesRouter } from './sites/site-preview-route.js';
import { invalidJsonHandler } from './invalid-json-handler.js';

// CORS and auth must trust the same origin, so both use the checked config.
export function createApp({
  auth,
  webOrigin = 'http://localhost:3100',
}: { auth?: AuthInstance; webOrigin?: string } = {}): Express {
  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY ?? false);

  app.use(cors({ origin: webOrigin, credentials: true }));
  if (auth) app.use('/api', createAuthRouter(auth));
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/v1/sites', createSitesRouter({ appOrigin: webOrigin }));

  app.use(invalidJsonHandler);

  return app;
}
