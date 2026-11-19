import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { FeedbackEntry } from './feedback.type.js';

describe('POST /api/v1/feedback', () => {
  let app: ReturnType<typeof createApp>;
  let saved: FeedbackEntry[];
  let failSave: boolean;
  // The rate limit is shared, so each test gets its own address.
  let testCount = 0;

  beforeEach(() => {
    saved = [];
    failSave = false;
    testCount += 1;
    const ip = `192.0.2.${testCount}`;
    app = createApp({
      saveFeedback: async (entry) => {
        if (failSave) throw new Error('database down');
        saved = [...saved, entry];
      },
      getClientIp: () => ip,
    });
  });

  const post = (body: unknown) =>
    app.request('/api/v1/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('saves a message with an email', async () => {
    const response = await post({
      message: '  Love it  ',
      email: 'a@example.com',
    });
    expect(response.status).toBe(201);
    expect(saved).toEqual([{ message: 'Love it', email: 'a@example.com' }]);
  });

  it('saves a message without an email', async () => {
    const response = await post({ message: 'Hi', email: '' });
    expect(response.status).toBe(201);
    expect(saved).toEqual([{ message: 'Hi', email: null }]);
  });

  it.each([
    {},
    { message: '' },
    { message: '   ' },
    { message: 42 },
    { message: 'a'.repeat(2001) },
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
      body: JSON.stringify({ message: 'Hi' }),
    });
    expect(response.status).toBe(201);
  });

  it.each(['text/plain', 'application/x-www-form-urlencoded'])(
    'rejects a %s body, which a cross-site form could send',
    async (type) => {
      const response = await app.request('/api/v1/feedback', {
        method: 'POST',
        headers: { 'content-type': type },
        body: JSON.stringify({ message: 'Hi' }),
      });
      expect(response.status).toBe(400);
      expect(saved).toEqual([]);
    },
  );

  it('limits how often one address can send', async () => {
    const statuses = [];
    for (let index = 0; index < 6; index += 1) {
      statuses.push((await post({ message: `Hi ${index}` })).status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it('answers 500 without details when saving fails', async () => {
    failSave = true;
    const response = await post({ message: 'Hi' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'internal',
      message: 'Could not save feedback',
    });
  });
});
