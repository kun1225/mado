import type { ComponentProps } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from 'cn';

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
          'h-10 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-fg disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('overflow-x-hidden overflow-y-auto', className)}
      {...props}
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
      className={cn('py-6 text-center text-sm text-muted-fg', className)}
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
        '**:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-1.5 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:text-muted-fg',
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
        'relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted',
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
