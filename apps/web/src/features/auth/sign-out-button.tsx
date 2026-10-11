import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@repo/ui/button';

import type { AuthSignOutButtonProps } from './auth.type';
import { authClient } from './auth-client';

export function SignOutButton({ userId }: AuthSignOutButtonProps) {
  const session = authClient.useSession();
  useEffect(() => {
    if (session.isPending || session.error) return;
    if (session.data?.user.id !== userId) window.location.replace('/sign-in');
  }, [session.data, session.isPending, session.error, userId]);
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
      if (result.error)
        throw new Error('Could not sign out. Please try again.');
      await queryClient.cancelQueries();
      queryClient.clear();
      window.location.replace('/sign-in');
    } catch {
      setError('Could not sign out. Please try again.');
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
