import { Cancel01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@repo/ui/dialog';

import { useSignOut } from '#/features/auth/auth-hooks';
import type {
  SettingsDialogProps,
  SettingsSidebarProps,
} from '#/features/settings/settings.type';
import { useSettingsSearch } from '#/features/settings/settings-hooks';

import { SettingsAccountTab } from './settings-account-tab';

const EMAIL_FIELD_ID = 'settings-auth-email';

export function SettingsDialog({ authUser }: SettingsDialogProps) {
  const { search, close, setAuthMode } = useSettingsSearch();

  return (
    <Dialog
      open={search.tab !== null}
      onOpenChange={(open) => !open && close()}
    >
      <DialogContent
        className="flex items-stretch justify-center sm:items-center sm:p-4"
        onBackdropClick={close}
      >
        <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-bg text-fg shadow-xl sm:h-[min(36rem,100%)] sm:max-w-3xl sm:flex-row sm:rounded-xl">
          <SettingsSidebar
            authUser={authUser}
            onSignIn={() => setAuthMode('sign-in')}
          />
          <section className="flex min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between px-6">
              <DialogTitle className="text-lg font-medium">Account</DialogTitle>
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close settings"
                    className="text-muted-fg hover:text-fg"
                  />
                }
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={18}
                  strokeWidth={1.5}
                />
              </DialogClose>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
              <div className="max-w-sm">
                <SettingsAccountTab
                  authUser={authUser}
                  search={search}
                  onAuthModeChange={setAuthMode}
                />
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// *** SettingsSidebar ***
// Tabs are places and sign in/out is an action, so the action sits apart at the bottom.
function SettingsSidebar({ authUser, onSignIn }: SettingsSidebarProps) {
  return (
    <nav
      aria-label="Settings"
      className="flex shrink-0 items-center gap-2 border-b border-border p-3 sm:w-52 sm:flex-col sm:items-stretch sm:border-r sm:border-b-0"
    >
      <p className="hidden px-3 pt-2 pb-3 text-xs text-muted-fg sm:block">
        Settings
      </p>
      <div
        aria-current="page"
        className="flex h-9.5 items-center gap-2 rounded-md bg-muted px-4 text-sm font-medium"
      >
        <HugeiconsIcon icon={UserCircleIcon} size={18} strokeWidth={1.5} />
        Account
      </div>
      <div className="ml-auto sm:mt-auto sm:ml-0">
        <SettingsSidebarAction authUser={authUser} onSignIn={onSignIn} />
      </div>
    </nav>
  );
}

// *** SettingsSidebarAction ***
function SettingsSidebarAction({ authUser, onSignIn }: SettingsSidebarProps) {
  const { signOut, pending, error } = useSignOut();

  if (!authUser) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onSignIn();
          // The reset form has no email field until the sign-in form renders.
          requestAnimationFrame(() =>
            document.getElementById(EMAIL_FIELD_ID)?.focus(),
          );
        }}
      >
        Sign in
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() => void signOut()}
        className="w-full justify-start text-danger hover:text-danger"
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {error && (
        <p role="alert" className="px-3 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
