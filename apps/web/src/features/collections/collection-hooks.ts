import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createCollection,
  fetchAllCollections,
  fetchCollection,
  updateCollection,
} from './collection-actions'
import type { Collection, UpdateCollectionInput } from './collection-types'

export const collectionKeys = {
  all: ['collections'] as const,
  detail: (id: string) => ['collections', id] as const,
}

const isBrowser = typeof indexedDB !== 'undefined'

export function useCollections() {
  return useQuery({
    queryKey: collectionKeys.all,
    queryFn: fetchAllCollections,
    enabled: isBrowser,
  })
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => fetchCollection(id),
    enabled: isBrowser && Boolean(id),
  })
}

export function useCreateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCollection,
    onSuccess: (collection: Collection) => {
      queryClient.setQueryData<Collection[]>(
        collectionKeys.all,
        (collections = []) => [collection, ...collections],
      )
      queryClient.setQueryData(
        collectionKeys.detail(collection.id),
        collection,
      )
    },
  })
}

export function useUpdateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateCollectionInput
    }) => updateCollection(id, input),
    onSuccess: (collection: Collection) => {
      queryClient.setQueryData(
        collectionKeys.detail(collection.id),
        collection,
      )
      queryClient.setQueryData<Collection[]>(
        collectionKeys.all,
        (collections = []) =>
          collections.map((current) =>
            current.id === collection.id ? collection : current,
          ),
      )
    },
  })
}
