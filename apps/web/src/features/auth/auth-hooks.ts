import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { AuthGoogleSignInState } from './auth.type';
import { signInWithGoogle } from './auth-actions';
import { authClient } from './auth-client';

const SIGN_OUT_ERROR = 'Could not sign out. Please try again.';
const CONNECT_ERROR = 'Could not connect. Please try again.';

// Signing out lands on the guest library, because guest data stays on this device.
export function useSignOut() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  // *** signOut ***
  async function signOut() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(SIGN_OUT_ERROR);
      await queryClient.cancelQueries();
      queryClient.clear();
      window.location.replace('/library');
    } catch {
      setError(SIGN_OUT_ERROR);
      setPending(false);
    }
  }

  return { signOut, pending, error };
}

// A full-page redirect, so the next page load picks the right account storage.
export function useGoogleSignIn(): AuthGoogleSignInState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  // A ref, because two fast clicks both run before the pending state renders.
  const starting = useRef(false);

  // Back can restore this page from the cache with the button still busy.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      starting.current = false;
      setPending(false);
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // *** start ***
  async function start(returnTo: string) {
    if (starting.current) return;
    starting.current = true;
    setPending(true);
    setError('');
    try {
      const result = await signInWithGoogle(returnTo);
      // Stay busy until the browser leaves for Google.
      if (!result.error) return;
      setError(result.error);
    } catch {
      setError(CONNECT_ERROR);
    }
    starting.current = false;
    setPending(false);
  }

  return { start, pending, error };
}
