import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    message: text('message').notNull(),
    // Nullable because rows from before email was required have none.
    email: text('email'),
    // Nullable because rows from before the Postgres rate limit have none.
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('feedback_ip_hash_created_at_idx').on(table.ipHash, table.createdAt),
  ],
);
