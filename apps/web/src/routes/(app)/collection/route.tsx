import { createFileRoute, Outlet } from '@tanstack/react-router';

import { SearchBar } from '#/components/search-bar';
import { StorageUnsupportedNotice } from '#/components/storage-unsupported-notice';
import { loadPageSession } from '#/features/auth/auth-session';
import { SignOutButton } from '#/features/auth/sign-out-button';
import { useIsSourceStorageSupported } from '#/features/sources/hooks/source-hooks';
import { setStorageAccount } from '#/features/storage/storage-account';

export const Route = createFileRoute('/(app)/collection')({
  beforeLoad: ({ location }) => loadPageSession(location.href),
  component: RouteComponent,
});

function RouteComponent() {
  const { authUser } = Route.useRouteContext();
  if (authUser && typeof window !== 'undefined') setStorageAccount(authUser.id);
  const isStorageSupported = useIsSourceStorageSupported();

  return (
    <main className="flex min-h-svh flex-col px-edge">
      {authUser && <SignOutButton userId={authUser.id} />}
      {isStorageSupported ? <Outlet /> : <StorageUnsupportedNotice />}
      {isStorageSupported && <SearchBar />}
    </main>
  );
}
