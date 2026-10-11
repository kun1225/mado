import { Image01FreeIcons, TrashFreeIcons } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';

import {
  LiquidTabs,
  LiquidTabsList,
  LiquidTabsTrigger,
} from '@repo/ui/liquid-tab';
import { Separator } from '@repo/ui/separator';

import { SearchBar } from '#/components/search-bar';
import { StorageUnsupportedNotice } from '#/components/storage-unsupported-notice';
import { loadPageSession } from '#/features/auth/auth-session';
import { SignOutButton } from '#/features/auth/sign-out-button';
import { useIsSourceStorageSupported } from '#/features/sources/hooks/source-hooks';
import { setStorageAccount } from '#/features/storage/storage-account';

export const Route = createFileRoute('/(app)/library')({
  beforeLoad: ({ location }) => loadPageSession(location.href),
  component: RouteComponent,
});

const DELETED_TAB = '/library/deleted';
const ALL_TAB = '/library';

type TabPath = typeof ALL_TAB | typeof DELETED_TAB;

function RouteComponent() {
  const { authUser } = Route.useRouteContext();
  if (authUser && typeof window !== 'undefined') setStorageAccount(authUser.id);
  const navigate = useNavigate();
  const isStorageSupported = useIsSourceStorageSupported();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activeTab = pathname.startsWith(DELETED_TAB) ? DELETED_TAB : ALL_TAB;

  function handleTabChange(value: TabPath) {
    void navigate({ to: value });
  }

  return (
    <main className="flex min-h-dvh flex-col px-edge pt-16 pb-24">
      <LiquidTabs value={activeTab} onValueChange={handleTabChange}>
        <LiquidTabsList>
          <LiquidTabsTrigger
            value={ALL_TAB}
            icon={<HugeiconsIcon icon={Image01FreeIcons} />}
          >
            All
          </LiquidTabsTrigger>
          <LiquidTabsTrigger
            value={DELETED_TAB}
            icon={<HugeiconsIcon icon={TrashFreeIcons} />}
          >
            Deleted
          </LiquidTabsTrigger>
        </LiquidTabsList>
      </LiquidTabs>

      <Separator className="mt-3" />

      {authUser && <SignOutButton userId={authUser.id} />}
      {isStorageSupported ? <Outlet /> : <StorageUnsupportedNotice />}
      {isStorageSupported && <SearchBar />}
    </main>
  );
}
