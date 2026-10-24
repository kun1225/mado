import { z } from 'zod';

import type { ApiFlags } from './flags.type.js';

// Each flag mirrors one in apps/web/src/features/flags/flags.ts.
const flagSchema = z.object({
  FLAG_AUTH_GOOGLE: z.enum(['true', 'false']).default('true'),
  FLAG_AUTH_EMAIL_PASSWORD: z.enum(['true', 'false']).default('false'),
});

export function readFlags(env: NodeJS.ProcessEnv = process.env): ApiFlags {
  const values = flagSchema.safeParse(env);
  if (!values.success) {
    const fields = values.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(`Invalid flags (use true or false): ${fields}`);
  }

  return {
    authGoogle: values.data.FLAG_AUTH_GOOGLE === 'true',
    authEmailPassword: values.data.FLAG_AUTH_EMAIL_PASSWORD === 'true',
  };
}
