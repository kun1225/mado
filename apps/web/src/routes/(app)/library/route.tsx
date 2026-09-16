import { Image01FreeIcons, TrashFreeIcons } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, Outlet } from '@tanstack/react-router';

import {
  LiquidTabs,
  LiquidTabsList,
  LiquidTabsTrigger,
} from '@repo/ui/liquid-tab';
import { Separator } from '@repo/ui/separator';

export const Route = createFileRoute('/(app)/library')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="px-edge flex flex-col pt-16 pb-6">
      <LiquidTabs defaultValue="overview">
        <LiquidTabsList>
          <LiquidTabsTrigger
            value="overview"
            icon={<HugeiconsIcon icon={Image01FreeIcons} />}
          >
            All
          </LiquidTabsTrigger>
          <LiquidTabsTrigger
            value="settings"
            icon={<HugeiconsIcon icon={TrashFreeIcons} />}
          >
            Delete
          </LiquidTabsTrigger>
        </LiquidTabsList>
      </LiquidTabs>

      <Separator className="mt-3" />

      <Outlet />
    </main>
  );
}
