export type AuthFormMode =
  'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

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
};

export type AuthPageProps = {
  mode: AuthFormMode;
  returnTo?: string;
  token?: string;
  error?: string;
};

export type AuthVerifyEmailProps = {
  verified: boolean;
  error?: string;
};

export type AuthSignedInGuardProps = {
  userId: string;
};
