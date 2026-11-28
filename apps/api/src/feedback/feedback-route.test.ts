import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { FeedbackEntry } from './feedback.type.js';

const IP = '192.0.2.1';

describe('POST /api/v1/feedback', () => {
  let app: ReturnType<typeof createApp>;
  let saved: { entry: FeedbackEntry; ip: string }[];
  let recentCount: number;
  let failStore: boolean;

  beforeEach(() => {
    saved = [];
    recentCount = 0;
    failStore = false;
    app = createApp({
      feedbackStore: {
        saveWithinLimit: async (entry, ip, limit) => {
          if (failStore) throw new Error('database down');
          if (recentCount >= limit.max) return false;
          saved = [...saved, { entry, ip }];
          return true;
        },
      },
      getClientIp: () => IP,
    });
  });

  const post = (body: unknown) =>
    app.request('/api/v1/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('saves a trimmed message and email with the client IP', async () => {
    const response = await post({
      message: '  Love it  ',
      email: ' a@example.com ',
    });
    expect(response.status).toBe(201);
    expect(saved).toEqual([
      { entry: { message: 'Love it', email: 'a@example.com' }, ip: IP },
    ]);
  });

  it.each([
    {},
    { message: '' },
    { message: '   ', email: 'a@example.com' },
    { message: 42, email: 'a@example.com' },
    { message: 'a'.repeat(2001), email: 'a@example.com' },
    { message: 'Hi' },
    { message: 'Hi', email: '' },
    { message: 'Hi', email: 'not an email' },
  ])('rejects invalid input %j', async (body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'invalid-feedback' });
    expect(saved).toEqual([]);
  });

  it('accepts a JSON type in any letter case', async () => {
    const response = await app.request('/api/v1/feedback', {
      method: 'POST',
      headers: { 'content-type': 'Application/JSON; charset=utf-8' },
      body: JSON.stringify({ message: 'Hi', email: 'a@example.com' }),
    });
    expect(response.status).toBe(201);
  });

  it.each(['text/plain', 'application/x-www-form-urlencoded'])(
    'rejects a %s body, which a cross-site form could send',
    async (type) => {
      const response = await app.request('/api/v1/feedback', {
        method: 'POST',
        headers: { 'content-type': type },
        body: JSON.stringify({ message: 'Hi', email: 'a@example.com' }),
      });
      expect(response.status).toBe(400);
      expect(saved).toEqual([]);
    },
  );

  it('sends a 5th message in an hour', async () => {
    recentCount = 4;
    const response = await post({ message: 'Hi', email: 'a@example.com' });
    expect(response.status).toBe(201);
  });

  it('blocks a 6th message in an hour', async () => {
    recentCount = 5;
    const response = await post({ message: 'Hi', email: 'a@example.com' });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: 'rate-limited' });
    expect(saved).toEqual([]);
  });

  it('answers 500 without details when the store fails', async () => {
    failStore = true;
    const response = await post({ message: 'Hi', email: 'a@example.com' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'internal',
      message: 'Could not save feedback',
    });
  });
});
