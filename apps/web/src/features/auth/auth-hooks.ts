import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authClient } from './auth-client';

const SIGN_OUT_ERROR = 'Could not sign out. Please try again.';

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
