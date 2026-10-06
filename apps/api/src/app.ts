import cors from 'cors';
import express, { type Express } from 'express';

import { invalidJsonHandler } from './invalid-json-handler.js';
import { createSitesRouter } from './sites/site-preview-route.js';

export function createApp(): Express {
  const app = express();

  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3100';

  app.use(cors({ origin: webOrigin }));
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/v1/sites', createSitesRouter({ appOrigin: webOrigin }));

  app.use(invalidJsonHandler);

  return app;
}
