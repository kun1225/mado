import { createAuth, readAuthConfig } from './auth/auth.js';
import { createDatabase } from './database/database.js';
import { feedback } from './feedback/feedback.model.js';
import { createApp } from './app.js';

const config = readAuthConfig();
const { db, pool } = createDatabase(config.databaseUrl);
await pool.query('SELECT 1');
const auth = createAuth({ database: db, config });
const port = Number(process.env.PORT ?? 4000);
const app = createApp({
  auth,
  saveFeedback: async (entry) => {
    await db.insert(feedback).values(entry);
  },
  webOrigin: config.webOrigin,
});
const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => {
      void pool.end();
    });
  });
}
