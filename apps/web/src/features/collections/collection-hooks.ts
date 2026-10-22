import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  sourceKeys,
  useAllSources,
} from '#/features/sources/hooks/source-hooks';
import type { Source } from '#/features/sources/source-types';

import {
  createCollection,
  deleteCollection,
  fetchAllCollections,
  fetchCollection,
  pickPreviewSources,
  updateCollection,
} from './collection-actions';
import { useShowFolderSources } from './collection-preference-hooks';
import type { Collection, UpdateCollectionInput } from './collection-types';

// Queries add the folder sources setting at the end, so these work as prefixes for every variant.
export const collectionKeys = {
  all: ['collections'] as const,
  lists: ['collections', 'list'] as const,
  detail: (id: string) => ['collections', 'detail', id] as const,
};

const isBrowser = typeof indexedDB !== 'undefined';

export function useCollections() {
  const { showFolderSources } = useShowFolderSources();

  return useQuery({
    queryKey: [...collectionKeys.lists, showFolderSources],
    queryFn: () => fetchAllCollections({ includeFolders: showFolderSources }),
    // Flipping the setting must not swap the page for a skeleton.
    placeholderData: keepPreviousData,
    enabled: isBrowser,
  });
}

export function useChildCollections(parentId: string | null) {
  const { showFolderSources } = useShowFolderSources();

  return useQuery({
    queryKey: [...collectionKeys.lists, showFolderSources],
    queryFn: () => fetchAllCollections({ includeFolders: showFolderSources }),
    // Flipping the setting must not swap the page for a skeleton.
    placeholderData: keepPreviousData,
    enabled: isBrowser,
    select: (collections) =>
      collections.filter(
        (collection) => (collection.parentId ?? null) === parentId,
      ),
  });
}

export function useCollection(id: string) {
  const { showFolderSources } = useShowFolderSources();

  return useQuery({
    queryKey: [...collectionKeys.detail(id), showFolderSources],
    queryFn: () => fetchCollection(id, { includeFolders: showFolderSources }),
    // Safe across collections, because the page remounts for each one.
    placeholderData: keepPreviousData,
    enabled: isBrowser && Boolean(id),
  });
}

export function useCollectionPreviews(collectionId: string): Source[] {
  const { showFolderSources } = useShowFolderSources();
  const collections = useCollections().data;
  const sources = useAllSources().data;

  if (!collections || !sources) return [];

  return pickPreviewSources(collections, sources, collectionId, {
    includeFolders: showFolderSources,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCollection,
    onSuccess: (collection: Collection) => {
      // A new collection is empty, so its count is right for both settings.
      queryClient.setQueriesData<Collection[]>(
        { queryKey: collectionKeys.lists },
        (collections = []) => [collection, ...collections],
      );
      for (const showFolderSources of [true, false]) {
        queryClient.setQueryData(
          [...collectionKeys.detail(collection.id), showFolderSources],
          collection,
        );
      }
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCollectionInput }) =>
      updateCollection(id, input),
    // Each cached variant keeps its own saveCount, because the returned one counts folder sources.
    onSuccess: (collection: Collection) => {
      queryClient.setQueriesData<Collection | null>(
        { queryKey: collectionKeys.detail(collection.id) },
        (current) => current && { ...collection, saveCount: current.saveCount },
      );
      // Sorted again, so a renamed card moves to the front right away.
      queryClient.setQueriesData<Collection[]>(
        { queryKey: collectionKeys.lists },
        (collections = []) =>
          collections
            .map((current) =>
              current.id === collection.id
                ? { ...collection, saveCount: current.saveCount }
                : current,
            )
            .sort((first, second) =>
              second.updatedAt.localeCompare(first.updatedAt),
            ),
      );
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCollection,
    onSuccess: (collection: Collection) => {
      queryClient.setQueriesData<Collection[]>(
        { queryKey: collectionKeys.lists },
        (collections = []) =>
          collections.filter((current) => current.id !== collection.id),
      );
      queryClient.removeQueries({
        queryKey: collectionKeys.detail(collection.id),
      });
      queryClient.removeQueries({
        queryKey: sourceKeys.byCollection(collection.id),
      });

      return Promise.all([
        // Child collections were deleted too, so refresh every collection query.
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
        queryClient.invalidateQueries({
          queryKey: sourceKeys.all,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: sourceKeys.deleted,
          exact: true,
        }),
      ]);
    },
  });
}
