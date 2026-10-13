import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '#/components/auth/auth-page';

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: RouteComponent,
});

function RouteComponent() {
  return <AuthPage mode="forgot-password" />;
}
