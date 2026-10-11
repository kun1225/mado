import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '#/features/auth/auth-page';

export const Route = createFileRoute('/forgot-password')({
  component: RouteComponent,
});

function RouteComponent() {
  return <AuthPage mode="forgot-password" />;
}
