import type { ComponentProps } from 'react';
import { useRef } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Command as CommandPrimitive, useCommandState } from 'cmdk';
import { cn } from './cn';

import { useClipHighlight } from './clip-highlight';

function Command({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('flex flex-col text-fg', className)}
      {...props}
    />
  );
}

function CommandInput({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex min-w-0 flex-1 items-center gap-2"
    >
      <HugeiconsIcon
        icon={Search01Icon}
        className="size-4.5 shrink-0 text-muted-fg"
      />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-10 w-full min-w-0 bg-transparent t-b-2 outline-none placeholder:text-muted-fg disabled:cursor-not-allowed disabled:opacity-50 sm:t-b-3',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  children,
  ...props
}: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'overflow-x-hidden overflow-y-auto [&>[cmdk-list-sizer]]:relative [&>[cmdk-list-sizer]]:isolate',
        className,
      )}
      {...props}
    >
      <CommandHighlight />
      {children}
    </CommandPrimitive.List>
  );
}

// *** CommandHighlight ***
function CommandHighlight() {
  const layerRef = useRef<HTMLDivElement>(null);
  const selected = useCommandState((state) => state.value);
  useClipHighlight(
    layerRef,
    // Not CSS.escape, because it does not exist during server render.
    selected
      ? `[cmdk-item][data-value="${selected.replace(/["\\]/g, '\\$&')}"]`
      : null,
  );

  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 bg-muted"
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center t-b-3 text-muted-fg', className)}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        '**:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-1.5 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:t-b-4 **:[[cmdk-group-heading]]:text-muted-fg',
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('mx-1 my-1.5 h-px bg-border', className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 t-b-3 outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
};
