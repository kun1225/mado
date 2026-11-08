import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';

import type { AuthFormMode } from '#/features/auth/auth.type';
import { useDesktopBridge } from '#/features/desktop/desktop-hooks';
import {
  useAllSources,
  useDeletedSources,
} from '#/features/sources/hooks/source-hooks';
import type { StorageUsage } from '#/features/storage/storage-usage';
import { readStorageUsage } from '#/features/storage/storage-usage';

import type { SettingsTab } from './settings.type';
import { parseSettingsSearch, withoutSettingsSearch } from './settings-search';
import { toStorageBreakdown } from './settings-storage-breakdown';

// The browser's number says nothing about a folder on disk, so the desktop app counts its own files and has no quota.
const DESKTOP_STORAGE_USAGE: StorageUsage = { usage: 0, quota: null };

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

/** Null while loading, or when the browser cannot report its storage. */
export function useStorageBreakdown() {
  const { data: sources } = useAllSources();
  const { data: deleted } = useDeletedSources();
  const isDesktop = useDesktopBridge() !== undefined;
  const { data: estimate } = useQuery({
    // Counts in the key, so an import or a delete reads the usage again.
    queryKey: ['storage-usage', isDesktop, sources?.length, deleted?.length],
    queryFn: () =>
      isDesktop ? Promise.resolve(DESKTOP_STORAGE_USAGE) : readStorageUsage(),
    enabled: sources !== undefined && deleted !== undefined,
    // Reading the estimate never touches the network, so offline must not pause it.
    networkMode: 'always',
    placeholderData: keepPreviousData,
  });

  if (estimate == null || !sources || !deleted) return null;
  return toStorageBreakdown(estimate, [...sources, ...deleted]);
}
