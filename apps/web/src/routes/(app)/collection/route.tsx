import { createFileRoute, Outlet, useParams } from '@tanstack/react-router';

import { ActionDock } from '#/components/action-dock';
import { StorageUnsupportedNotice } from '#/components/storage-unsupported-notice';
import { useIsSourceStorageSupported } from '#/features/sources/hooks/source-hooks';

export const Route = createFileRoute('/(app)/collection')({
  component: RouteComponent,
});

function RouteComponent() {
  const isStorageSupported = useIsSourceStorageSupported();
  const { collectionId } = useParams({ strict: false });

  return (
    <main className="flex min-h-svh flex-col px-edge">
      {isStorageSupported ? <Outlet /> : <StorageUnsupportedNotice />}
      {isStorageSupported && (
        <ActionDock addSource={collectionId ? { collectionId } : undefined} />
      )}
    </main>
  );
}
