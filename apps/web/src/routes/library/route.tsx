import { createFileRoute, Outlet } from '@tanstack/react-router'


export const Route = createFileRoute('/library')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main>
      Hello "/library"!
      <Outlet />
    </main>
  )
}
