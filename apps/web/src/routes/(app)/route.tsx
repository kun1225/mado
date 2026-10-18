import { useEffect } from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router';

import { SettingsDialog } from '#/components/settings/settings-dialog';
import type { AuthSignedInGuardProps } from '#/features/auth/auth.type';
import { authClient } from '#/features/auth/auth-client';
import { loadPageSession } from '#/features/auth/auth-session';
import { setStorageAccount } from '#/features/storage/storage-account';

// One session check for every page under (app), so new pages get per-account storage for free.
export const Route = createFileRoute('/(app)')({
  beforeLoad: ({ location }) => loadPageSession(location.href),
  component: RouteComponent,
});

function RouteComponent() {
  const { authUser } = Route.useRouteContext();
  // beforeLoad does not run in the browser after SSR, so set the account here too.
  if (authUser && typeof window !== 'undefined') setStorageAccount(authUser.id);

  return (
    <>
      {authUser && <SignedInGuard userId={authUser.id} />}
      <Outlet />
      <SettingsDialog authUser={authUser} />
    </>
  );
}

// *** SignedInGuard ***
// Another tab may sign out or switch accounts. Leave, so local data stays with its owner.
function SignedInGuard({ userId }: AuthSignedInGuardProps) {
  const session = authClient.useSession();
  useEffect(() => {
    if (session.isPending || session.error) return;
    if (session.data?.user.id !== userId) window.location.replace('/library');
  }, [session.data, session.isPending, session.error, userId]);

  return null;
}
