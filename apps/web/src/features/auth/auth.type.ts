export const AUTH_FORM_MODES = [
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
] as const;

export type AuthFormMode = (typeof AUTH_FORM_MODES)[number];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthFormInput = {
  name: string;
  email: string;
  password: string;
  token?: string;
  returnTo?: string;
};

export type AuthFormResult = {
  error?: string;
  message?: string;
  needsVerification?: boolean;
  nextMode?: AuthFormMode;
};

export type AuthGoogleSignInState = {
  start: (returnTo: string) => Promise<void>;
  pending: boolean;
  error: string;
};

export type AuthSignedInGuardProps = {
  userId: string;
};
