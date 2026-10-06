import { createFileRoute, Outlet } from '@tanstack/react-router';

import { StorageUnsupportedNotice } from '#/components/storage-unsupported-notice';
import { useIsSourceStorageSupported } from '#/features/sources/hooks/source-hooks';

export const Route = createFileRoute('/(app)/collection')({
  component: RouteComponent,
});

function RouteComponent() {
  const isStorageSupported = useIsSourceStorageSupported();

  return (
    <main className="flex min-h-svh flex-col px-edge">
      {isStorageSupported ? <Outlet /> : <StorageUnsupportedNotice />}
    </main>
  );
}
