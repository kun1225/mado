import { createAuth, readAuthConfig } from './auth/auth.js';
import { createDatabase } from './database/database.js';
import { createFeedbackStore } from './feedback/feedback-store.js';
import { createApp } from './app.js';
import type { WorkerContext, WorkerEnv } from './worker.type.js';

export default {
  // A Worker cannot reuse a database connection across requests, so each
  // request opens its own. Hyperdrive does the real pooling.
  async fetch(request: Request, env: WorkerEnv, context: WorkerContext) {
    const config = readAuthConfig({
      ...process.env,
      DATABASE_URL: env.HYPERDRIVE.connectionString,
    });
    const { db, pool } = createDatabase(config.databaseUrl);
    const app = createApp({
      auth: createAuth({ database: db, config }),
      feedbackStore: createFeedbackStore(db, config.secret),
      webOrigin: config.webOrigin,
      getClientIp: (c) => c.req.header('cf-connecting-ip'),
    });

    try {
      return await app.fetch(request);
    } finally {
      context.waitUntil(pool.end());
    }
  },
};
