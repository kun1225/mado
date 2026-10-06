import { useEffect, useState, useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ZodError } from 'zod';

import { toast } from '@repo/ui/sonner';

import { collectionKeys } from '#/features/collections/collection-hooks';

import type { SiteSourceInput } from '../site-source.type';
import {
  compressSource,
  createSources,
  createWebsiteSource,
  deleteSource,
  deleteSources,
  fetchAllSources,
  fetchDeletedSources,
  fetchSourcesByCollection,
  hardDeleteSource,
  hardDeleteSources,
  restoreSources,
  updateSource,
} from '../source-actions';
import { isMediaStorageSupported, readMediaFile } from '../source-media';
import type { Source, UpdateSourceInput } from '../source-types';

export const sourceKeys = {
  all: ['sources'] as const,
  deleted: ['sources', 'deleted'] as const,
  byCollection: (collectionId: string) =>
    ['sources', 'collection', collectionId] as const,
};

const isSupported = typeof indexedDB !== 'undefined' && isMediaStorageSupported;

/**
 * The server cannot see browser storage, so it assumes support; the client
 * corrects that after hydration instead of mismatching the server HTML.
 */
export function useIsSourceStorageSupported(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => isSupported,
    () => true,
  );
}

// *** subscribeToNothing ***
// Support never changes while the page is open.
function subscribeToNothing() {
  return () => {};
}

export function useAllSources() {
  return useQuery({
    queryKey: sourceKeys.all,
    queryFn: fetchAllSources,
    enabled: isSupported,
  });
}

/** Every tag in use, for suggestions. */
export function useAllTags() {
  const { data } = useAllSources();

  return [...new Set((data ?? []).flatMap((source) => source.tags))].sort();
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

const COMPRESS_MUTATION_KEY = ['sources', 'compress'] as const;

function useCompressSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: COMPRESS_MUTATION_KEY,
    mutationFn: compressSource,
    onSettled: (_source, _error, original) =>
      invalidateAfterSourceChange(queryClient, original.collectionIds),
  });
}

/** Ids of sources whose stored file is still being shrunk in the background. */
export function useCompressingSourceIds(): ReadonlySet<string> {
  const ids = useMutationState({
    filters: { mutationKey: COMPRESS_MUTATION_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as Source).id,
  });

  return new Set(ids);
}

const CREATE_MUTATION_KEY = ['sources', 'create'] as const;

export function useCreateSources() {
  const queryClient = useQueryClient();
  const { mutate: compress } = useCompressSource();

  return useMutation({
    mutationKey: CREATE_MUTATION_KEY,
    mutationFn: createSources,
    // The sources are already visible at this point; shrinking them happens
    // afterwards so the upload feels instant.
    onSuccess: ({ sources, error }) => {
      sources.forEach((source) => compress(source));
      if (error) toast.error(toCreateErrorMessage(error));
    },
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: (_data, _error, inputs) =>
      invalidateAfterSourceChange(
        queryClient,
        inputs.map(({ collectionId }) => collectionId),
      ),
  });
}

export function useCreateWebsiteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: CREATE_MUTATION_KEY,
    mutationFn: (input: SiteSourceInput) => createWebsiteSource(input),
    onSuccess: (source) => {
      if (source.site?.captureStatus === 'failed') {
        toast.warning('Website saved without a screenshot.');
      }
    },
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: (_data, _error, input) =>
      invalidateAfterSourceChange(queryClient, [input.collectionId]),
  });
}

// *** toCreateErrorMessage ***
function toCreateErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'That file is not supported.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while adding the file.';
}

/** True while any upload is saving, from the + button, paste, or a drop. */
export function useIsCreatingSources(): boolean {
  return useIsMutating({ mutationKey: CREATE_MUTATION_KEY }) > 0;
}

export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSourceInput }) =>
      updateSource(id, input),
    // A collection change moves the source between lists and counts, and the
    // old collection ids are not known here, so refresh every sources list.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceKeys.all }),
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
      ]),
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSource,
    onSuccess: (source) => {
      showUndoDeleteToast(queryClient, [source]);
      return invalidateAfterSourceChange(queryClient, source.collectionIds);
    },
  });
}

export function useDeleteSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSources,
    onSuccess: (sources) => {
      showUndoDeleteToast(queryClient, sources);
      return invalidateAfterSourceChange(
        queryClient,
        sources.flatMap(({ collectionIds }) => collectionIds),
      );
    },
  });
}

// *** showUndoDeleteToast ***
function showUndoDeleteToast(queryClient: QueryClient, sources: Source[]) {
  if (sources.length === 0) return;

  toast(toTrashMessage(sources), {
    action: {
      label: 'Undo',
      onClick: () => {
        restoreSources(sources.map(({ id }) => id))
          .then((restored) =>
            invalidateAfterSourceChange(
              queryClient,
              restored.flatMap(({ collectionIds }) => collectionIds),
            ),
          )
          .catch((error: unknown) => {
            console.error('Failed to undo the delete.', error);
            toast.error('Could not undo. Find it in the Deleted tab.');
          });
      },
    },
  });
}

// *** toTrashMessage ***
function toTrashMessage(sources: Pick<Source, 'name'>[]): string {
  return sources.length === 1
    ? `"${sources[0].name}" deleted`
    : `${sources.length} saves deleted`;
}

export function useRestoreSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreSources,
    onSuccess: (sources) =>
      invalidateAfterSourceChange(
        queryClient,
        sources.flatMap(({ collectionIds }) => collectionIds),
      ),
  });
}

export function useHardDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteSource,
    // Settled, not success: a failed media delete still leaves the record gone.
    onSettled: (source) =>
      invalidateAfterSourceChange(queryClient, source?.collectionIds ?? []),
  });
}

export function useHardDeleteSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteSources,
    // Settled, not success: a failed media delete still leaves the records gone.
    onSettled: (sources) =>
      invalidateAfterSourceChange(
        queryClient,
        sources?.flatMap(({ collectionIds }) => collectionIds) ?? [],
      ),
  });
}

/**
 * Reads the stored file and hands back a blob URL, revoked on unmount so the
 * browser can free the bytes.
 *
 * OPFS does not keep the MIME type, so `slice` re-attaches it. Slicing a file
 * is lazy, so this does not copy the bytes.
 */
export function useMediaObjectUrl(
  storageKey: string | null,
  mimeType: string,
  sizeBytes: number,
) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (storageKey === null) return;
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
    // The size changes when compression swaps the stored bytes in place, which
    // would leave the old blob URL pointing at a file that no longer exists.
  }, [storageKey, mimeType, sizeBytes]);

  return objectUrl;
}

export { toTrashMessage };
