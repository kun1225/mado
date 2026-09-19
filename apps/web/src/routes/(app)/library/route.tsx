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

export const Route = createFileRoute('/(app)/library')({
  component: RouteComponent,
});

const DELETED_TAB = '/library/deleted';
const ALL_TAB = '/library';

type TabPath = typeof ALL_TAB | typeof DELETED_TAB;

function RouteComponent() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activeTab = pathname.startsWith(DELETED_TAB) ? DELETED_TAB : ALL_TAB;

  function handleTabChange(value: TabPath) {
    void navigate({ to: value });
  }

  return (
    <main className="flex min-h-dvh flex-col px-edge pt-16 pb-6">
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

      <Outlet />
    </main>
  );
}
