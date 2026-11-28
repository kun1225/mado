import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';

import { createAuth, readAuthConfig } from './auth/auth.js';
import { createDatabase } from './database/database.js';
import { createFeedbackStore } from './feedback/feedback-store.js';
import { createApp } from './app.js';

const config = readAuthConfig();
const { db, pool } = createDatabase(config.databaseUrl);
await pool.query('SELECT 1');
const auth = createAuth({ database: db, config });
const port = Number(process.env.PORT ?? 4000);
const app = createApp({
  auth,
  feedbackStore: createFeedbackStore(db, config.secret),
  webOrigin: config.webOrigin,
  // No proxy trust: in production the Cloudflare Worker reads the client IP instead.
  getClientIp: (c) => getConnInfo(c).remote.address,
});
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      void pool.end();
    });
  });
}
