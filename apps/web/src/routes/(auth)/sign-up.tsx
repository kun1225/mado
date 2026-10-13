import { createFileRoute } from '@tanstack/react-router';

import { AuthPage } from '#/components/auth/auth-page';

export const Route = createFileRoute('/(auth)/sign-up')({
  component: RouteComponent,
});

function RouteComponent() {
  return <AuthPage mode="sign-up" />;
}
