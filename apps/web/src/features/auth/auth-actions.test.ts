import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { googleSignInErrorMessage, signInWithGoogle } from './auth-actions';
import { authClient } from './auth-client';

vi.mock('./auth-client', () => ({
  authClient: { signIn: { social: vi.fn() } },
}));

const social = vi.mocked(authClient.signIn.social);

describe('signInWithGoogle', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'https://mado.example' } });
    social.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    social.mockReset();
  });

  it('returns to the same page, and reopens the account panel on errors', async () => {
    expect(await signInWithGoogle('/collection/c1?source=s1#top')).toEqual({});
    expect(social).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: 'https://mado.example/collection/c1?source=s1#top',
      errorCallbackURL:
        'https://mado.example/collection/c1?source=s1&settings=account#top',
    });
  });

  it('never returns to a page outside the app', async () => {
    await signInWithGoogle('/sign-in');
    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: 'https://mado.example/library' }),
    );
  });

  it('shows a friendly message when sign-in cannot start', async () => {
    social.mockResolvedValue({ data: null, error: { status: 429 } });
    expect(await signInWithGoogle('/library')).toEqual({
      error: 'Too many tries. Please wait a minute.',
    });
    social.mockResolvedValue({ data: null, error: { status: 500 } });
    expect(await signInWithGoogle('/library')).toEqual({
      error: 'Could not sign in with Google. Please try again.',
    });
  });
});

describe('googleSignInErrorMessage', () => {
  it.each([
    ['access_denied', 'Google sign-in was canceled. Please try again.'],
    [
      'account_not_linked',
      'This email already has an unfinished Mado account. Contact support.',
    ],
    ['state_mismatch', 'Could not sign in with Google. Please try again.'],
    ['<script>', 'Could not sign in with Google. Please try again.'],
  ])('shows fixed copy for %s', (code, message) =>
    expect(googleSignInErrorMessage(code)).toBe(message),
  );
});
