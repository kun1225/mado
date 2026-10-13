import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { AuthPage } from '#/components/auth/auth-page';
import { safeReturnTo } from '#/features/auth/auth-session';

export const Route = createFileRoute('/(auth)/sign-in')({
  validateSearch: z.object({
    returnTo: z.string().optional().transform(safeReturnTo),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  return <AuthPage mode="sign-in" {...search} />;
}
