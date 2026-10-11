import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from '../auth/auth.model.js';

export function createDatabase(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  return { db: drizzle(pool, { schema }), pool };
}
