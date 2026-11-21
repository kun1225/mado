// From shadcn's base-vega Combobox, trimmed to the chips parts.
// The select-style trigger, value and clear button are left out on purpose.
import type * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from './cn';

const Combobox = ComboboxPrimitive.Root;

export type ComboboxChangeDetails = ComboboxPrimitive.Root.ChangeEventDetails;

/** No border or box, so the chips read as a plain row like the Collections chips. */
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  removeLabel,
  ...props
}: ComboboxPrimitive.Chip.Props & { removeLabel: string }) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 t-b-4 text-fg outline-none data-highlighted:ring-2 data-highlighted:ring-ring/50',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ComboboxPrimitive.ChipRemove
        aria-label={removeLabel}
        className="flex size-4 items-center justify-center rounded-full text-muted-fg hover:text-fg"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.5} />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(
        // Looks like a small "+ Add" pill at rest, and widens only while the user types in it.
        'w-15 rounded-full border border-border bg-bg px-2.5 py-0.5 t-b-4 text-fg outline-none placeholder:text-muted-fg hover:placeholder:text-fg focus:min-w-32 focus:flex-1 focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxContent({
  className,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, 'anchor'>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side="bottom"
        align="start"
        sideOffset={6}
        anchor={anchor}
        className="isolate z-popover"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            'max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-48 overflow-hidden rounded-md border border-border bg-bg text-fg shadow-lg transition-opacity duration-fast ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0',
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        'max-h-72 scroll-py-1 overflow-y-auto overscroll-contain p-1',
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        'flex h-9 cursor-default items-center gap-2 rounded-sm px-2 t-b-3 text-fg outline-none select-none data-highlighted:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
};
