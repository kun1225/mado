import type { FeedbackInput } from './feedback.type';

export const FEEDBACK_MAX_LENGTH = 2000;

const FEEDBACK_API = `${import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:4000'}/api/v1/feedback`;

const FEEDBACK_UNREACHABLE =
  'Could not reach the Mado server. Check your internet and try again.';
const FEEDBACK_FAILED = 'Could not send your feedback. Please try again.';
// Keyed by the `error` code the API returns.
const FEEDBACK_ERRORS: Record<string, string> = {
  'invalid-feedback': 'Check the message and the email, then try again.',
  'rate-limited': 'You sent a lot of messages. Please try again in an hour.',
};

export async function sendFeedback(input: FeedbackInput): Promise<void> {
  const response = await fetch(FEEDBACK_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).catch((error: unknown) => {
    throw new Error(FEEDBACK_UNREACHABLE, { cause: error });
  });
  if (!response.ok) throw new Error(await readFeedbackError(response));
}

// *** readFeedbackError ***
async function readFeedbackError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const code =
    body && typeof body === 'object' && 'error' in body ? body.error : null;
  return (typeof code === 'string' && FEEDBACK_ERRORS[code]) || FEEDBACK_FAILED;
}
