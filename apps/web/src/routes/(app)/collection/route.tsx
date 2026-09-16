import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(app)/collection')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="px-edge">
      <Outlet />
    </main>
  );
}
