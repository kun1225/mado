import { useEffect, useState, useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  keepPreviousData,
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ZodError } from 'zod';

import { toast } from '@repo/ui/sonner';

import { collectionKeys } from '#/features/collections/collection-hooks';
import { useShowFolderSources } from '#/features/collections/collection-preference-hooks';

import {
  addFontFaces,
  removeFontFace,
  updateFontCover,
  updateFontSample,
} from '../font-actions';
import type { SitePendingSource, SiteSourceInput } from '../site-source.type';
import {
  changeTagGroup,
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
  replaceSourceFile,
  restoreSources,
  saveSourcePalette,
  updateSource,
  updateSourceText,
} from '../source-actions';
import { isMediaStorageSupported, readMediaFile } from '../source-media';
import type { Source, UpdateSourceInput } from '../source-types';

import { unloadFontFace } from './font-hooks';

export const sourceKeys = {
  all: ['sources'] as const,
  deleted: ['sources', 'deleted'] as const,
  byCollection: (collectionId: string) =>
    ['sources', 'collection', collectionId] as const,
};

const isSupported = typeof indexedDB !== 'undefined' && isMediaStorageSupported;

/** The server cannot see browser storage, so it says yes. The client fixes it after hydration. */
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

export function useDeletedSources() {
  return useQuery({
    queryKey: sourceKeys.deleted,
    queryFn: fetchDeletedSources,
    enabled: isSupported,
  });
}

export function useSources(collectionId: string) {
  const { showFolderSources } = useShowFolderSources();

  return useQuery({
    queryKey: [...sourceKeys.byCollection(collectionId), showFolderSources],
    queryFn: () =>
      fetchSourcesByCollection(collectionId, {
        includeFolders: showFolderSources,
      }),
    // Flipping the setting keeps the grid and its selection while the new list loads.
    placeholderData: keepPreviousData,
    enabled: isSupported && Boolean(collectionId),
  });
}

// A source also shows in every parent folder, so refresh all source lists and counts.
function invalidateAfterSourceChange(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: sourceKeys.all }),
    queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  ]);
}

const COMPRESS_MUTATION_KEY = ['sources', 'compress'] as const;

export function useCompressSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: COMPRESS_MUTATION_KEY,
    mutationFn: compressSource,
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

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
    // Shrink files after they show up, so the upload feels instant.
    onSuccess: ({ sources, error }) => {
      sources.forEach((source) => compress(source));
      if (error) toast.error(toCreateErrorMessage(error));
    },
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

// Under the create key, so `useIsCreatingSources` still counts it.
const CREATE_WEBSITE_MUTATION_KEY = [
  ...CREATE_MUTATION_KEY,
  'website',
] as const;

export function useCreateWebsiteSource() {
  const queryClient = useQueryClient();
  const { mutate: compress } = useCompressSource();

  const mutation = useMutation({
    mutationKey: CREATE_WEBSITE_MUTATION_KEY,
    mutationFn: (input: SiteSourceInput) => createWebsiteSource(input),
    // A post can come back as a video, so shrink it too.
    onSuccess: (source) => compress(source),
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });

  return {
    ...mutation,
    mutate: (input: Omit<SiteSourceInput, 'id'>) =>
      mutation.mutate({ ...input, id: crypto.randomUUID() }),
  };
}

// *** toCreateErrorMessage ***
function toCreateErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'That file is not supported.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while adding the file.';
}

/** `collectionId` undefined means the library, which shows every source. */
export function usePendingSites(collectionId?: string): SitePendingSource[] {
  const inputs = useMutationState({
    filters: { mutationKey: CREATE_WEBSITE_MUTATION_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as SiteSourceInput,
  });

  return toPendingSites(inputs, collectionId);
}

// *** toPendingSites ***
function toPendingSites(
  inputs: SiteSourceInput[],
  collectionId: string | undefined,
): SitePendingSource[] {
  return inputs
    .filter(
      (input) =>
        collectionId === undefined || input.collectionId === collectionId,
    )
    .map((input) => ({
      id: input.id,
      kind: 'pending-site' as const,
      domain: toSiteDomain(input.url),
    }))
    .reverse();
}

// *** toSiteDomain ***
function toSiteDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // The schema rejects it soon after, so the card only needs some label.
    return url;
  }
}

export function useIsCreatingSources(): boolean {
  return useIsMutating({ mutationKey: CREATE_MUTATION_KEY }) > 0;
}

export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSourceInput }) =>
      updateSource(id, input),
    onSuccess: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useSaveSourcePalette() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      storageKey,
      palette,
    }: {
      id: string;
      storageKey: string;
      palette: string[];
    }) => saveSourcePalette(id, storageKey, palette),
    onSuccess: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useChangeTagGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeTagGroup,
    onSuccess: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useUpdateSourceText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateSourceText(id, body),
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSuccess: () => invalidateAfterSourceChange(queryClient),
  });
}

const REPLACE_MUTATION_KEY = ['sources', 'replace'] as const;

export function useReplaceSourceFile() {
  const queryClient = useQueryClient();
  const { mutate: compress } = useCompressSource();

  return useMutation({
    mutationKey: REPLACE_MUTATION_KEY,
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      replaceSourceFile(id, file),
    onSuccess: (source) => compress(source),
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

/** Under the replace key: for a font, adding styles takes the place of replacing its file. */
export function useAddFontFaces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: REPLACE_MUTATION_KEY,
    mutationFn: ({ id, files }: { id: string; files: File[] }) =>
      addFontFaces(id, files),
    onSuccess: ({ error }) => {
      if (error) toast.error(toCreateErrorMessage(error));
    },
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useRemoveFontFace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, storageKey }: { id: string; storageKey: string }) =>
      removeFontFace(id, storageKey),
    onSuccess: (_source, { storageKey }) => unloadFontFace(storageKey),
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useUpdateFontSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      updateFontSample(id, text),
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useUpdateFontCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, storageKey }: { id: string; storageKey: string }) =>
      updateFontCover(id, storageKey),
    onError: (error) => toast.error(toCreateErrorMessage(error)),
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

// The toolbar, viewer and panel can each start a replace, so they share one pending state.
export function useIsReplacingSource(id: string | undefined): boolean {
  const ids = useMutationState({
    filters: { mutationKey: REPLACE_MUTATION_KEY, status: 'pending' },
    select: (mutation) => (mutation.state.variables as { id: string }).id,
  });

  return id !== undefined && ids.includes(id);
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSource,
    onSuccess: (source) => {
      showUndoDeleteToast(queryClient, [source]);
      return invalidateAfterSourceChange(queryClient);
    },
  });
}

export function useDeleteSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSources,
    onSuccess: (sources) => {
      showUndoDeleteToast(queryClient, sources);
      return invalidateAfterSourceChange(queryClient);
    },
  });
}

// Keeps the toast on one line so "deleted" and Undo stay visible.
const TRASH_MESSAGE_NAME_MAX = 24;

// *** showUndoDeleteToast ***
function showUndoDeleteToast(queryClient: QueryClient, sources: Source[]) {
  if (sources.length === 0) return;

  toast(toTrashMessage(sources), {
    action: {
      label: 'Undo',
      onClick: () => {
        restoreSources(sources.map(({ id }) => id))
          .then(() => invalidateAfterSourceChange(queryClient))
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
    ? `"${truncateName(sources[0].name)}" deleted`
    : `${sources.length} saves deleted`;
}

// *** truncateName ***
function truncateName(name: string): string {
  return name.length > TRASH_MESSAGE_NAME_MAX
    ? `${name.slice(0, TRASH_MESSAGE_NAME_MAX).trimEnd()}…`
    : name;
}

export function useRestoreSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreSources,
    onSuccess: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useHardDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteSource,
    // Refresh even on failure: a failed file delete still removes the record.
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

export function useHardDeleteSources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteSources,
    // Refresh even on failure: a failed file delete still removes the records.
    onSettled: () => invalidateAfterSourceChange(queryClient),
  });
}

/**
 * Revoke the URL on unmount so the browser can free the bytes.
 *
 * OPFS loses the MIME type, so `slice` adds it back. `slice` does not copy the bytes.
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

export { toPendingSites, toTrashMessage };
