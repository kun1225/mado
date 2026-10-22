import type { ReactNode } from 'react';

import type { AuthFormMode, AuthUser } from '#/features/auth/auth.type';
import type { ExportProgress } from '#/features/export/export.type';
import type { ImportProgress } from '#/features/import/import.type';

export const SETTINGS_TABS = ['general', 'account', 'data'] as const;

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

export type SettingsSwitchRowProps = {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
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

export type SettingsProgressProps = {
  /** Read by screen readers as the bar's name. */
  name: string;
  label: string;
  progress: ExportProgress | ImportProgress;
};

export type SettingsStoragePart = {
  kind: 'videos' | 'images' | 'other';
  label: string;
  bytes: number;
};

export type SettingsStorageBreakdown = {
  total: number;
  /** Null when the browser gives no limit. */
  quota: number | null;
  parts: SettingsStoragePart[];
};

export type SettingsStorageSectionProps = {
  breakdown: SettingsStorageBreakdown;
};

export type SettingsBackupSectionProps = {
  /** Missing while the library is still loading. */
  summary?: string;
  canExport: boolean;
  exporting: boolean;
  importing: boolean;
  exportProgress: ExportProgress | null;
  importProgress: ImportProgress | null;
  onExport: () => void;
  onImport: (files: File[]) => void;
};
