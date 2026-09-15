import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createCollection,
  fetchAllCollections,
  fetchCollection,
} from './collection-actions'
import type { Collection } from './collection-types'

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
