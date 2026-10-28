import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendFeedback } from './feedback-actions';

describe('sendFeedback', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubFetch = (response: Response | Error) => {
    const fetchMock = vi.fn(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('posts the message and the email', async () => {
    const fetchMock = stubFetch(new Response('{"ok":true}', { status: 201 }));
    await sendFeedback({ message: 'Hi', email: 'a@example.com' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Hi', email: 'a@example.com' }),
      }),
    );
  });

  it('explains when the server is unreachable', async () => {
    stubFetch(new TypeError('Failed to fetch'));
    await expect(sendFeedback({ message: 'Hi', email: '' })).rejects.toThrow(
      'Could not reach the Mado server',
    );
  });

  it('explains when too many messages were sent', async () => {
    stubFetch(new Response('{"error":"rate-limited"}', { status: 429 }));
    await expect(sendFeedback({ message: 'Hi', email: '' })).rejects.toThrow(
      'You sent a lot of messages',
    );
  });

  it('explains a bad email', async () => {
    stubFetch(new Response('{"error":"invalid-feedback"}', { status: 400 }));
    await expect(
      sendFeedback({ message: 'Hi', email: 'nope' }),
    ).rejects.toThrow('Check the message and the email');
  });

  it('falls back to a general error', async () => {
    stubFetch(new Response('oops', { status: 500 }));
    await expect(sendFeedback({ message: 'Hi', email: '' })).rejects.toThrow(
      'Could not send your feedback',
    );
  });
});
