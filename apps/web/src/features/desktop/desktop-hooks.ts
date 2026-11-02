import { useEffect, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { collectionKeys } from '#/features/collections/collection-hooks';
import { sourceKeys } from '#/features/sources/hooks/source-hooks';

import { getDesktopBridge } from './desktop-bridge';
import type { MadoDesktopBridge } from './desktop-bridge.type';

const folderKey = ['desktop', 'folder'] as const;

/**
 * The bridge, or `undefined` on the web. The server and the first client render
 * both say `undefined`, so the page hydrates cleanly before the desktop UI shows.
 */
export function useDesktopBridge(): MadoDesktopBridge | undefined {
  return useSyncExternalStore(
    subscribeToNothing,
    getDesktopBridge,
    () => undefined,
  );
}

// *** subscribeToNothing ***
// The bridge never changes while the page is open.
function subscribeToNothing() {
  return () => {};
}

/** Where the library lives. `undefined` data while loading, and on the web. */
export function useLibraryFolder() {
  const bridge = useDesktopBridge();
  const queryClient = useQueryClient();

  const { data: folder } = useQuery({
    queryKey: folderKey,
    queryFn: () => bridge?.folder.status(),
    enabled: bridge !== undefined,
    // Reading a local setting never touches the network, so offline must not pause it.
    networkMode: 'always',
  });

  const choose = useMutation({
    mutationFn: () => bridge?.folder.choose() ?? Promise.resolve(null),
    onSuccess: (status) => {
      // A closed picker changes nothing.
      if (!status) return;
      // Another folder is another library, so everything on screen is stale.
      void queryClient.invalidateQueries();
    },
  });

  return {
    folder,
    chooseFolder: () => choose.mutate(),
    choosing: choose.isPending,
    retryFolder: () =>
      void queryClient.invalidateQueries({ queryKey: folderKey }),
    revealFolder: () => void bridge?.folder.reveal(),
  };
}

/** Refreshes the lists when a record file is edited outside the app, for example by an AI agent. */
export function useLibraryChanges() {
  const bridge = useDesktopBridge();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bridge) return;

    return bridge.onLibraryChange(() => {
      // A record can change a collection's count and previews, so both lists refresh.
      void queryClient.invalidateQueries({ queryKey: sourceKeys.all });
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    });
  }, [bridge, queryClient]);
}
