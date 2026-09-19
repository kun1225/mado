import { useEffect, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { collectionKeys } from '#/features/collections/collection-hooks';

import {
  createSources,
  deleteSource,
  fetchAllSources,
  fetchDeletedSources,
  fetchSourcesByCollection,
  hardDeleteSource,
} from './source-actions';
import { isMediaStorageSupported, readMediaFile } from './source-storage';

export const sourceKeys = {
  all: ['sources'] as const,
  deleted: ['sources', 'deleted'] as const,
  byCollection: (collectionId: string) =>
    ['sources', 'collection', collectionId] as const,
};

const isSupported = typeof indexedDB !== 'undefined' && isMediaStorageSupported;

export function useAllSources() {
  return useQuery({
    queryKey: sourceKeys.all,
    queryFn: fetchAllSources,
    enabled: isSupported,
  });
}

export function useDeletedSources() {
  return useQuery({
    queryKey: sourceKeys.deleted,
    queryFn: fetchDeletedSources,
    enabled: isSupported,
  });
}

export function useSources(collectionId: string) {
  return useQuery({
    queryKey: sourceKeys.byCollection(collectionId),
    queryFn: () => fetchSourcesByCollection(collectionId),
    enabled: isSupported && Boolean(collectionId),
  });
}

function invalidateAfterSourceChange(
  queryClient: QueryClient,
  collectionIds: (string | null)[],
) {
  const affectedCollectionIds = new Set(
    collectionIds.filter((id): id is string => id !== null),
  );
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: sourceKeys.all, exact: true }),
    queryClient.invalidateQueries({
      queryKey: sourceKeys.deleted,
      exact: true,
    }),
  ];

  for (const id of affectedCollectionIds) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: sourceKeys.byCollection(id),
      }),
      queryClient.invalidateQueries({
        queryKey: collectionKeys.detail(id),
      }),
    );
  }

  if (affectedCollectionIds.size > 0) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: collectionKeys.all,
        exact: true,
      }),
    );
  }

  return Promise.all(invalidations);
}

export function useCreateSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSources,
    onSettled: (_data, _error, inputs) =>
      invalidateAfterSourceChange(
        queryClient,
        inputs.map(({ collectionId }) => collectionId),
      ),
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSource,
    onSuccess: (source) =>
      invalidateAfterSourceChange(queryClient, [source.collectionId]),
  });
}

export function useHardDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteSource,
    // Settled, not success: a failed media delete still leaves the record gone.
    onSettled: (source) =>
      invalidateAfterSourceChange(queryClient, [source?.collectionId ?? null]),
  });
}

/**
 * Reads the stored file and hands back a blob URL, revoked on unmount so the
 * browser can free the bytes.
 *
 * OPFS does not keep the MIME type, so `slice` re-attaches it. Slicing a file
 * is lazy, so this does not copy the bytes.
 */
export function useMediaObjectUrl(storageKey: string, mimeType: string) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let createdUrl: string | undefined;
    let isCancelled = false;

    readMediaFile(storageKey)
      .then((file) => {
        if (isCancelled) return;
        createdUrl = URL.createObjectURL(file.slice(0, file.size, mimeType));
        setObjectUrl(createdUrl);
      })
      .catch((error) => {
        console.error(`Failed to read media file: ${storageKey}`, error);
      });

    return () => {
      isCancelled = true;
      setObjectUrl(null);
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [storageKey, mimeType]);

  return objectUrl;
}
