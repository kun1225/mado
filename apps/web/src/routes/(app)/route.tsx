import { useEffect } from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router';

import { SignOutButton } from '#/components/auth/sign-out-button';
import type { AuthSignedInGuardProps } from '#/features/auth/auth.type';
import { authClient } from '#/features/auth/auth-client';
import { loadPageSession } from '#/features/auth/auth-session';
import { setStorageAccount } from '#/features/storage/storage-account';

// Every page under (app) shares one session check, so new pages get account-scoped storage for free.
export const Route = createFileRoute('/(app)')({
  beforeLoad: ({ location }) => loadPageSession(location.href),
  component: RouteComponent,
});

function RouteComponent() {
  const { authUser } = Route.useRouteContext();
  // beforeLoad skips the browser branch on SSR hydration, so bind the account here too.
  if (authUser && typeof window !== 'undefined') setStorageAccount(authUser.id);

  return (
    <>
      {authUser && <SignedInGuard userId={authUser.id} />}
      <Outlet />
    </>
  );
}

// *** SignedInGuard ***
// Another tab may sign out or switch accounts; leave so local data stays with its owner.
function SignedInGuard({ userId }: AuthSignedInGuardProps) {
  const session = authClient.useSession();
  useEffect(() => {
    if (session.isPending || session.error) return;
    if (session.data?.user.id !== userId) window.location.replace('/sign-in');
  }, [session.data, session.isPending, session.error, userId]);

  return <SignOutButton />;
}
