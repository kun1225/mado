import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Input } from '@repo/ui/input'
import { Separator } from '@repo/ui/separator'

import { useCollection } from '#/features/collections/collection-hooks'

import { NewCollectionCard } from '../library/-components/new-collection-card'

export const Route = createFileRoute('/(app)/collection/$collectionId')({
  component: CollectionPage,
})

function CollectionPage() {
  const { collectionId } = Route.useParams()
  const collectionQuery = useCollection(collectionId)

  if (collectionQuery.isPending) return <p>Loading...</p>
  if (collectionQuery.isError) {
    return <p>Unable to load this collection.</p>
  }
  if (!collectionQuery.data) return <p>Collection not found.</p>

  return (
    <>
      <div className="flex h-11 items-center gap-1">
        <Link
          to="/library"
          className="border-border text-fg hover:border-fg flex size-8 items-center justify-center rounded-full border transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
        </Link>
        <Input
          defaultValue={collectionQuery.data.name}
          className="h-8 w-fit border-transparent px-3 text-2xl font-semibold"
        />
      </div>

      <Separator className="mt-3" />

      <div className="py-6">
        <NewCollectionCard label="New folder" />
      </div>
    </>
  )
}
