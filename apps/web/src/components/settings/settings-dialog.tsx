import { useRef, useState } from 'react';
import {
  Cancel01Icon,
  Database01Icon,
  PaintBoardIcon,
  PreferenceHorizontalIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';
import { useClipHighlight } from '@repo/ui/clip-highlight';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@repo/ui/dialog';

import { useSignOut } from '#/features/auth/auth-hooks';
import type {
  SettingsDialogProps,
  SettingsSidebarActionProps,
  SettingsSidebarProps,
  SettingsSidebarTabsProps,
  SettingsTab,
} from '#/features/settings/settings.type';
import { useSettingsSearch } from '#/features/settings/settings-hooks';

import { SettingsAccountTab } from './settings-account-tab';
import { SettingsAppearanceTab } from './settings-appearance-tab';
import { SettingsDataTab } from './settings-data-tab';
import { SettingsGeneralTab } from './settings-general-tab';

const EMAIL_FIELD_ID = 'settings-auth-email';
const GOOGLE_BUTTON_ID = 'settings-auth-google';

// The active layer copies the tab list, so both must share one layout.
const TAB_LIST_CLASS = 'flex items-center gap-0.5 sm:flex-col sm:items-stretch';
const TAB_CLASS =
  'flex h-9.5 items-center gap-2 rounded-md px-2.5 text-sm font-medium sm:px-4';
// Phones show icons only, so four tabs and the sign-in action fit in one row. The header names the tab.
const TAB_LABEL_CLASS = 'max-sm:sr-only';

const SETTINGS_TAB_ITEMS: readonly {
  tab: SettingsTab;
  label: string;
  icon: IconSvgElement;
}[] = [
  { tab: 'general', label: 'General', icon: PreferenceHorizontalIcon },
  { tab: 'appearance', label: 'Appearance', icon: PaintBoardIcon },
  { tab: 'account', label: 'Account', icon: UserCircleIcon },
  { tab: 'data', label: 'Data', icon: Database01Icon },
];

export function SettingsDialog({ authUser }: SettingsDialogProps) {
  const { search, close, selectTab, setAuthMode } = useSettingsSearch();
  const activeTab = search.tab ?? 'general';
  const activeLabel = SETTINGS_TAB_ITEMS.find(
    (item) => item.tab === activeTab,
  )?.label;

  return (
    <Dialog
      open={search.tab !== null}
      onOpenChange={(open) => !open && close()}
    >
      <DialogContent
        className="flex items-stretch justify-center data-closed:zoom-out-95 data-open:zoom-in-95 sm:items-center sm:p-4"
        onBackdropClick={close}
      >
        <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-bg text-fg shadow-xl sm:h-[min(36rem,100%)] sm:max-w-3xl sm:flex-row sm:rounded-xl">
          <SettingsSidebar
            authUser={authUser}
            activeTab={activeTab}
            onSelectTab={selectTab}
            onSignIn={() => setAuthMode('sign-in')}
          />
          <section className="flex min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between px-6">
              <DialogTitle className="text-lg font-medium">
                {activeLabel}
              </DialogTitle>
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
                {activeTab === 'general' && <SettingsGeneralTab />}
                {activeTab === 'appearance' && <SettingsAppearanceTab />}
                {activeTab === 'account' && (
                  <SettingsAccountTab
                    authUser={authUser}
                    search={search}
                    onAuthModeChange={setAuthMode}
                  />
                )}
                {activeTab === 'data' && <SettingsDataTab />}
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
function SettingsSidebar({
  authUser,
  activeTab,
  onSelectTab,
  onSignIn,
}: SettingsSidebarProps) {
  return (
    <nav
      aria-label="Settings"
      className="flex shrink-0 items-center gap-2 border-b border-border p-3 sm:w-52 sm:flex-col sm:items-stretch sm:border-r sm:border-b-0"
    >
      <p className="hidden px-3 pt-2 pb-3 text-xs text-muted-fg sm:block">
        Settings
      </p>
      <SettingsSidebarTabs activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="ml-auto sm:mt-auto sm:ml-0">
        <SettingsSidebarAction authUser={authUser} onSignIn={onSignIn} />
      </div>
    </nav>
  );
}

// *** SettingsSidebarTabs ***
// Hover and active are separate clipped layers so each can slide between tabs on its own.
function SettingsSidebarTabs({
  activeTab,
  onSelectTab,
}: SettingsSidebarTabsProps) {
  const hoverLayerRef = useRef<HTMLDivElement>(null);
  const activeLayerRef = useRef<HTMLDivElement>(null);
  // Never cleared, so the hover layer fades out in place instead of vanishing.
  const [hoveredTab, setHoveredTab] = useState<SettingsTab | null>(null);
  useClipHighlight(
    hoverLayerRef,
    hoveredTab && `[data-settings-tab="${hoveredTab}"]`,
  );
  useClipHighlight(activeLayerRef, `[data-settings-tab="${activeTab}"]`);

  return (
    <div className={cn('group relative', TAB_LIST_CLASS)}>
      <div
        ref={hoverLayerRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-muted/40 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100"
      />
      {SETTINGS_TAB_ITEMS.map((item) => (
        <button
          key={item.tab}
          type="button"
          data-settings-tab={item.tab}
          aria-current={item.tab === activeTab ? 'page' : undefined}
          onClick={() => onSelectTab(item.tab)}
          onPointerEnter={(event) => {
            // Touch has no hover; a tap would leave the layer stuck.
            if (event.pointerType === 'mouse') setHoveredTab(item.tab);
          }}
          className={cn(
            TAB_CLASS,
            'relative text-muted-fg transition-colors outline-none hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
        >
          <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
          <span className={TAB_LABEL_CLASS}>{item.label}</span>
        </button>
      ))}
      {/* The labels are drawn twice so the clip also darkens the text as it slides, like LiquidTabs. */}
      <div
        ref={activeLayerRef}
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-muted text-fg',
          TAB_LIST_CLASS,
        )}
      >
        {SETTINGS_TAB_ITEMS.map((item) => (
          <span key={item.tab} className={TAB_CLASS}>
            <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
            <span className={TAB_LABEL_CLASS}>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// *** SettingsSidebarAction ***
function SettingsSidebarAction({
  authUser,
  onSignIn,
}: SettingsSidebarActionProps) {
  const { signOut, pending, error } = useSignOut();

  if (!authUser) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => {
          onSignIn();
          // The reset form has no email field until the sign-in form renders,
          // and with email paused the Google button is the only control.
          requestAnimationFrame(() =>
            (
              document.getElementById(EMAIL_FIELD_ID) ??
              document.getElementById(GOOGLE_BUTTON_ID)
            )?.focus(),
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
