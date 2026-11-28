import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { count, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { feedback } from './feedback.model.js';
import { createFeedbackStore } from './feedback-store.js';

const SECRET = 'test-only-secret-with-at-least-32-characters';
const LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };
const entry = { message: 'Hi', email: 'a@example.com' };

describe('createFeedbackStore', () => {
  let postgres: PGlite;
  let database: ReturnType<typeof drizzle>;
  let store: ReturnType<typeof createFeedbackStore>;

  beforeAll(async () => {
    postgres = new PGlite();
    database = drizzle(postgres);
    await migrate(database, {
      migrationsFolder: fileURLToPath(
        new URL('../../drizzle', import.meta.url),
      ),
    });
    store = createFeedbackStore(database, SECRET);
  }, 30_000);

  beforeEach(async () => {
    await database.delete(feedback);
  });

  afterAll(async () => {
    await postgres.close();
  });

  it('saves while the IP is under the limit', async () => {
    expect(await saveFrom('192.0.2.1')).toBe(true);
    expect(await saveFrom('192.0.2.1')).toBe(true);
    expect(await countRows()).toBe(2);
  });

  it('refuses and saves nothing once the IP reaches the limit', async () => {
    for (let index = 0; index < LIMIT.max; index += 1) {
      await saveFrom('192.0.2.1');
    }
    expect(await saveFrom('192.0.2.1')).toBe(false);
    expect(await countRows()).toBe(LIMIT.max);
  });

  it('does not count other IPs', async () => {
    for (let index = 0; index < LIMIT.max; index += 1) {
      await saveFrom('192.0.2.1');
    }
    expect(await saveFrom('192.0.2.2')).toBe(true);
  });

  it('does not count rows older than the window', async () => {
    for (let index = 0; index < LIMIT.max; index += 1) {
      await saveFrom('192.0.2.1');
    }
    await database
      .update(feedback)
      .set({ createdAt: sql`now() - interval '61 minutes'` });
    expect(await saveFrom('192.0.2.1')).toBe(true);
  });

  it('saves only up to the limit when sends arrive at once', async () => {
    const results = await Promise.all(
      Array.from({ length: LIMIT.max * 2 }, () => saveFrom('192.0.2.1')),
    );
    expect(results.filter(Boolean)).toHaveLength(LIMIT.max);
    expect(await countRows()).toBe(LIMIT.max);
  });

  it('never stores the raw IP', async () => {
    await saveFrom('192.0.2.1');
    const [row] = await database.select().from(feedback);
    expect(row).toMatchObject(entry);
    expect(row?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain('192.0.2.1');
  });

  // *** saveFrom ***
  function saveFrom(ip: string) {
    return store.saveWithinLimit(entry, ip, LIMIT);
  }

  // *** countRows ***
  async function countRows() {
    const [row] = await database.select({ total: count() }).from(feedback);
    return row?.total ?? 0;
  }
});
