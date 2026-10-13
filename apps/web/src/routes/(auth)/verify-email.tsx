import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { VerifyEmailPage } from '#/components/auth/verify-email-page';

export const Route = createFileRoute('/(auth)/verify-email')({
  validateSearch: z.object({
    verified: z.union([z.literal('true'), z.literal(true)]).optional(),
    error: z.string().optional(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { verified, error } = Route.useSearch();
  return <VerifyEmailPage verified={Boolean(verified)} error={error} />;
}
