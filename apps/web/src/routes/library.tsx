import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/library')({ component: Library })

function Library() {
  return (
    <main>
      <p className="eyebrow">Library</p>
      <h1>Your references live here.</h1>
      <p className="intro">The first collection view will connect to the Express API.</p>
    </main>
  )
}
