import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  message: text('message').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
