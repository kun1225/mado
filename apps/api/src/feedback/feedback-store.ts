import { createHmac } from 'node:crypto';

import { and, count, eq, gt, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

import { feedback } from './feedback.model.js';
import type { FeedbackStore } from './feedback.type.js';

type FeedbackDatabase = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export function createFeedbackStore(
  database: FeedbackDatabase,
  secret: string,
): FeedbackStore {
  return {
    saveWithinLimit: (entry, ip, limit) => {
      const ipHash = hashIp(ip, secret);
      return database.transaction(async (tx) => {
        await lockIp(tx, ipHash);
        if ((await countRecent(tx, ipHash, limit.windowMs)) >= limit.max) {
          return false;
        }
        await tx.insert(feedback).values({ ...entry, ipHash });
        return true;
      });
    },
  };
}

// *** hashIp ***
// HMAC, not a plain hash: IPv4 has only ~4 billion values, so a plain hash is easy to reverse.
function hashIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

// *** lockIp ***
// Parallel sends from one IP wait here, so each counts the rows the others saved.
// Released on commit; a hashtext collision only makes two IPs wait for each other.
async function lockIp(tx: FeedbackDatabase, ipHash: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ipHash}))`);
}

// *** countRecent ***
async function countRecent(
  tx: FeedbackDatabase,
  ipHash: string,
  windowMs: number,
): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(feedback)
    .where(
      and(
        eq(feedback.ipHash, ipHash),
        // Postgres's own clock, because created_at comes from now() and JS time can differ in zone.
        gt(
          feedback.createdAt,
          sql`now() - make_interval(secs => ${windowMs / 1000})`,
        ),
      ),
    );
  return row?.total ?? 0;
}
