import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { AuthPage } from '#/features/auth/auth-page';

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    token: z.string().optional(),
    error: z.string().optional(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  return <AuthPage mode="reset-password" {...search} />;
}
