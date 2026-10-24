export type FlagName = 'authGoogle' | 'authEmailPassword';

export type FlagDefinition = {
  env: `VITE_FLAG_${string}`;
  default: boolean;
};
