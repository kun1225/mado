import type { FlagDefinition, FlagName } from './flags.type';

// Each flag mirrors one in apps/api/src/flags/flags.ts. The API is the real
// gate; the web flag only decides what to show.
const FLAGS = {
  authGoogle: { env: 'VITE_FLAG_AUTH_GOOGLE', default: true },
  authEmailPassword: { env: 'VITE_FLAG_AUTH_EMAIL_PASSWORD', default: false },
} as const satisfies Record<FlagName, FlagDefinition>;

// Callers only see this function, so the source can move from env to the API
// later without touching them.
export function isFlagOn(name: FlagName): boolean {
  const flag = FLAGS[name];
  const value: unknown = import.meta.env[flag.env];
  if (value === 'true') return true;
  if (value === 'false') return false;
  return flag.default;
}
