import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import type { AppGetClientIp } from './app.type.js';
import { createAuthRouter } from './auth/auth.route.js';
import type { AuthInstance } from './auth/auth.type.js';
import { createFeedbackRouter } from './feedback/feedback-route.js';
import type { FeedbackStore } from './feedback/feedback.type.js';
import { createSitesRouter } from './sites/site-preview-route.js';

// Matches the limit Express's JSON parser had, so big bodies stay rejected.
const MAX_BODY_BYTES = 100 * 1024;

// CORS and auth must trust the same origin, so both use the checked config.
// The runtime decides the client IP: the Node socket locally, a header on Workers.
export function createApp({
  auth,
  feedbackStore,
  webOrigin = 'http://localhost:3100',
  getClientIp = () => undefined,
}: {
  auth?: AuthInstance;
  feedbackStore?: FeedbackStore;
  webOrigin?: string;
  getClientIp?: AppGetClientIp;
} = {}) {
  const app = new Hono().basePath('/api');

  app.use(cors({ origin: webOrigin, credentials: true }));
  if (auth) app.route('/', createAuthRouter(auth, getClientIp));

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.use('/v1/*', bodyLimit({ maxSize: MAX_BODY_BYTES }));
  app.route('/v1/sites', createSitesRouter({ appOrigin: webOrigin }));
  if (feedbackStore)
    app.route(
      '/v1/feedback',
      createFeedbackRouter({ feedbackStore, getClientIp }),
    );

  return app;
}
