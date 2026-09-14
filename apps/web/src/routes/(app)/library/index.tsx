import { createFileRoute } from '@tanstack/react-router'

import { NewCollectionCard } from './new-collection-card'

export const Route = createFileRoute('/(app)/library/')({ component: Library })

function Library() {
  return (
    <section className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 py-6">
      <NewCollectionCard />
    </section>
  )
}
