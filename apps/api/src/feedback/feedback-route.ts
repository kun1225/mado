import { Hono } from 'hono';
import { z } from 'zod';

import type { AppGetClientIp } from '../app.type.js';
import { readJsonBody } from '../json-body.js';
import type { FeedbackRateLimit, FeedbackStore } from './feedback.type.js';

const MAX_MESSAGE_LENGTH = 2000;
// Counted in Postgres, because each Worker isolate has its own memory.
const RATE_LIMIT: FeedbackRateLimit = { windowMs: 60 * 60 * 1000, max: 5 };

const feedbackBodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  // Required, so every message can get a reply.
  email: z.string().trim().pipe(z.email().max(320)),
});

export function createFeedbackRouter({
  feedbackStore,
  getClientIp,
}: {
  feedbackStore: FeedbackStore;
  getClientIp: AppGetClientIp;
}) {
  const router = new Hono();

  // The body is checked first, so junk requests never reach the database.
  router.post('/', async (c) => {
    const body = feedbackBodySchema.safeParse(await readJsonBody(c));
    if (!body.success) {
      return c.json(
        { error: 'invalid-feedback', message: 'Write a message and an email' },
        400,
      );
    }

    const ip = getClientIp(c) ?? 'unknown';
    try {
      if (!(await feedbackStore.saveWithinLimit(body.data, ip, RATE_LIMIT))) {
        return c.json(
          { error: 'rate-limited', message: 'Too many messages' },
          429,
        );
      }
      return c.json({ ok: true }, 201);
    } catch (error) {
      console.error('Saving feedback failed:', error);
      return c.json(
        { error: 'internal', message: 'Could not save feedback' },
        500,
      );
    }
  });

  return router;
}
