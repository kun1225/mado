import { useNavigate, useSearch } from '@tanstack/react-router';

import type { AuthFormMode } from '#/features/auth/auth.type';

import type { SettingsTab } from './settings.type';
import { parseSettingsSearch, withoutSettingsSearch } from './settings-search';

// The panel lives in the URL, so email links can open it on the right form.
export function useSettingsSearch() {
  const raw: Record<string, unknown> = useSearch({ strict: false });
  const navigate = useNavigate();
  const search = parseSettingsSearch(raw);

  // *** setSettingsSearch ***
  function setSettingsSearch(
    next: Record<string, unknown>,
    options: { replace: boolean },
  ) {
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...withoutSettingsSearch(previous),
        ...next,
      }),
      replace: options.replace,
      resetScroll: false,
    } as never);
  }

  const open = (tab: SettingsTab) =>
    setSettingsSearch({ settings: tab }, { replace: false });

  const close = () => setSettingsSearch({}, { replace: true });

  const selectTab = (tab: SettingsTab) =>
    setSettingsSearch({ settings: tab }, { replace: true });

  // Switching forms drops the link's token and status, so a used link can't be replayed.
  // Always the account tab, because the auth form lives only there.
  const setAuthMode = (mode: AuthFormMode) =>
    setSettingsSearch(
      {
        settings: 'account',
        auth: mode === 'sign-in' ? undefined : mode,
      },
      { replace: true },
    );

  return { search, open, close, selectTab, setAuthMode };
}
