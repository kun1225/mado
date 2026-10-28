import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';

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

export function createFeedbackRouter({
  saveFeedback,
}: {
  saveFeedback: SaveFeedback;
}): ExpressRouter {
  const router = Router();
  const isOverLimit = createRateLimiter();

  router.post('/', async (request, response) => {
    if (isOverLimit(request.ip ?? 'unknown')) {
      response
        .status(429)
        .json({ error: 'rate-limited', message: 'Too many messages' });
      return;
    }

    const body = feedbackBodySchema.safeParse(request.body);
    if (!body.success) {
      response
        .status(400)
        .json({ error: 'invalid-feedback', message: 'Write a message' });
      return;
    }

    try {
      await saveFeedback(body.data);
      response.status(201).json({ ok: true });
    } catch (error) {
      console.error('Saving feedback failed:', error);
      response
        .status(500)
        .json({ error: 'internal', message: 'Could not save feedback' });
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
