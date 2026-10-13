import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@repo/ui/button';

import { authClient } from '#/features/auth/auth-client';

const SIGN_OUT_ERROR = 'Could not sign out. Please try again.';

export function SignOutButton() {
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
      window.location.replace('/sign-in');
    } catch {
      setError(SIGN_OUT_ERROR);
      setPending(false);
    }
  }

  return (
    <div className="fixed top-3 right-4 z-40 text-right">
      <Button variant="ghost" disabled={pending} onClick={() => void signOut()}>
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
