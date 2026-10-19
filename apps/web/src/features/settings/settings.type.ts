import type { ReactNode } from 'react';

import type { AuthFormMode, AuthUser } from '#/features/auth/auth.type';
import type { ExportProgress } from '#/features/export/export.type';

export const SETTINGS_TABS = ['account', 'data'] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export type SettingsSearch = {
  tab: SettingsTab | null;
  authMode: AuthFormMode;
  token?: string;
  verified: boolean;
  error?: string;
};

export type SettingsDialogProps = {
  authUser: AuthUser | null;
};

export type SettingsAccountTabProps = {
  authUser: AuthUser | null;
  search: SettingsSearch;
  onAuthModeChange: (mode: AuthFormMode) => void;
};

export type SettingsAuthFormProps = {
  mode: AuthFormMode;
  token?: string;
  verified: boolean;
  linkError?: string;
  onModeChange: (mode: AuthFormMode) => void;
};

export type SettingsSidebarProps = {
  authUser: AuthUser | null;
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  onSignIn: () => void;
};

export type SettingsSidebarTabsProps = Pick<
  SettingsSidebarProps,
  'activeTab' | 'onSelectTab'
>;

export type SettingsSidebarActionProps = Pick<
  SettingsSidebarProps,
  'authUser' | 'onSignIn'
>;

export type SettingsAuthFieldsProps = {
  mode: AuthFormMode;
  email: string;
  pending: boolean;
  onEmailChange: (value: string) => void;
};

export type SettingsAuthFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
};

export type SettingsAuthModeLinksProps = {
  mode: AuthFormMode;
  onModeChange: (mode: AuthFormMode) => void;
};

export type SettingsExportProgressProps = {
  progress: ExportProgress;
};
