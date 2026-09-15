import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useCreateCollection } from '#/features/collections/collection-hooks'

import { NewCollectionCard } from './new-collection-card'

export const Route = createFileRoute('/(app)/library/')({ component: Library })

function Library() {
  const navigate = useNavigate()
  const createCollectionMutation = useCreateCollection()

  async function handleCreateCollection() {
    const collection = await createCollectionMutation.mutateAsync()

    await navigate({
      to: '/collection/$collectionId',
      params: { collectionId: collection.id },
    })
  }

  return (
    <section className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 py-6">
      <NewCollectionCard
        disabled={createCollectionMutation.isPending}
        onClick={handleCreateCollection}
      />
    </section>
  )
}
