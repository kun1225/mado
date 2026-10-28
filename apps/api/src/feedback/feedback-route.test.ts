import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { FeedbackEntry } from './feedback.type.js';

describe('POST /api/v1/feedback', () => {
  let server: Server;
  let endpoint: string;
  let saved: FeedbackEntry[];
  let failSave: boolean;

  beforeEach(async () => {
    saved = [];
    failSave = false;
    server = createApp({
      saveFeedback: async (entry) => {
        if (failSave) throw new Error('database down');
        saved = [...saved, entry];
      },
    }).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/feedback`;
  });

  afterEach(() => {
    server.close();
  });

  const post = (body: unknown) =>
    fetch(endpoint, {
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
