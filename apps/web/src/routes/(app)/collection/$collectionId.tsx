import { createFileRoute } from '@tanstack/react-router'

import { useCollection } from '#/features/collections/collection-hooks'

export const Route = createFileRoute('/(app)/collection/$collectionId')({
  component: CollectionPage,
})

function CollectionPage() {
  const { collectionId } = Route.useParams()
  const collectionQuery = useCollection(collectionId)

  if (collectionQuery.isPending) return <p className="py-6">Loading...</p>
  if (collectionQuery.isError) {
    return <p className="py-6">Unable to load this collection.</p>
  }
  if (!collectionQuery.data) return <p className="py-6">Collection not found.</p>

  return (
    <section className="py-6">
      <h1 className="text-2xl font-semibold">{collectionQuery.data.name}</h1>
    </section>
  )
}
