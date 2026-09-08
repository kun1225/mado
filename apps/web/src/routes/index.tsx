import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <p className="eyebrow">Mado</p>
      <h1>Curate the work that moves you.</h1>
      <p className="intro">
        Save design references, organize them into categories, and build your personal visual library.
      </p>
      <a className="primary-link" href="/library">Open your library</a>
    </main>
  )
}
