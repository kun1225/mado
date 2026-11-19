import { Hono } from 'hono';
import { z } from 'zod';

import type { AppGetClientIp } from '../app.type.js';
import { readJsonBody } from '../json-body.js';
import type { SaveFeedback } from './feedback.type.js';

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MAX_KEYS = 10_000;

const feedbackBodySchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  // The form always sends the field, so an empty one means "no reply wanted".
  email: z
    .union([z.literal(''), z.email().max(320)])
    .optional()
    .transform((value) => value || null),
});

// Shared by every app in this process, because the Worker builds a new app per request.
const isOverLimit = createRateLimiter();

export function createFeedbackRouter({
  saveFeedback,
  getClientIp,
}: {
  saveFeedback: SaveFeedback;
  getClientIp: AppGetClientIp;
}) {
  const router = new Hono();

  router.post('/', async (c) => {
    if (isOverLimit(getClientIp(c) ?? 'unknown')) {
      return c.json(
        { error: 'rate-limited', message: 'Too many messages' },
        429,
      );
    }

    const body = feedbackBodySchema.safeParse(await readJsonBody(c));
    if (!body.success) {
      return c.json(
        { error: 'invalid-feedback', message: 'Write a message' },
        400,
      );
    }

    try {
      await saveFeedback(body.data);
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

// *** createRateLimiter ***
// In memory, because feedback is rare and losing the counts on restart is harmless.
function createRateLimiter() {
  const hits = new Map<string, number[]>();

  return (key: string): boolean => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter(
      (time) => now - time < RATE_LIMIT_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT_MAX) return true;
    // Many addresses would otherwise grow the map forever.
    if (hits.size >= RATE_LIMIT_MAX_KEYS) hits.clear();
    hits.set(key, [...recent, now]);
    return false;
  };
}
