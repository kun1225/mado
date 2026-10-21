import type { SettingsAccountTabProps } from '#/features/settings/settings.type';

import { SettingsAuthForm } from './settings-auth-form';

export function SettingsAccountTab({
  authUser,
  search,
  onAuthModeChange,
}: SettingsAccountTabProps) {
  if (authUser) {
    return (
      <dl className="space-y-4 text-sm">
        <div className="space-y-1">
          <dt className="text-muted-fg">Name</dt>
          <dd>{authUser.name}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-fg">Email</dt>
          <dd className="break-all">{authUser.email}</dd>
        </div>
      </dl>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-fg">
        You are using Mado as a guest. Your saves only stay on this device.
      </p>
      <SettingsAuthForm
        mode={search.authMode}
        token={search.token}
        verified={search.verified}
        linkError={search.error}
        onModeChange={onAuthModeChange}
      />
    </div>
  );
}
