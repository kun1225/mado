export type AuthFormMode =
  'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

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

export type AuthSignOutButtonProps = {
  userId: string;
};
