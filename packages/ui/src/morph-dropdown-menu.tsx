'use client';

import { Menu as Primitive } from '@base-ui/react/menu';
import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { springs } from './motion';
import {
  indicatorClassName,
  itemClassName,
  mergeRefs,
  MorphAnchorContext,
  MorphItemSurface,
  MorphPopup,
  useMorphAnchor,
  type MorphItemVariant,
  type MorphPopupProps,
} from './morph-menu-core';
import { cn } from './cn';
import * as React from 'react';

export type MorphDropdownMenuProps = Omit<Primitive.Root.Props, 'actionsRef'>;

/** The popup's CSS fade gives Base UI an exit animation to wait for. */
function MorphDropdownMenu(props: MorphDropdownMenuProps) {
  const actionsRef = React.useRef<Primitive.Root.Actions | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);

  return (
    <MorphAnchorContext.Provider value={{ actionsRef, anchorRef }}>
      <Primitive.Root {...props} actionsRef={actionsRef} />
    </MorphAnchorContext.Provider>
  );
}

function MorphDropdownMenuTrigger({
  className,
  ref,
  ...props
}: Primitive.Trigger.Props & React.RefAttributes<HTMLElement>) {
  const { anchorRef } = useMorphAnchor('MorphDropdownMenuTrigger');

  return (
    <Primitive.Trigger
      data-slot="morph-dropdown-menu-trigger"
      className={cn(
        'group relative flex h-10 w-fit min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-bg px-3 py-2 t-b-3 text-fg',
        'active:scale-98',
        'hover:not-data-disabled:bg-muted data-popup-open:not-data-disabled:bg-muted',
        'outline-2 outline-offset-2 outline-transparent focus-visible:outline-ring',
        'data-disabled:cursor-not-allowed data-disabled:text-muted-fg',
        'z-50',
        'transition-[background-color,outline-color,scale] duration-fast ease-standard',
        className,
      )}
      {...props}
      ref={mergeRefs(anchorRef, ref)}
    />
  );
}

export type MorphDropdownMenuContentProps = Omit<
  MorphPopupProps,
  'contentSlot' | 'openTransition'
>;

function MorphDropdownMenuContent(props: MorphDropdownMenuContentProps) {
  return (
    <MorphPopup
      contentSlot="morph-dropdown-menu-content"
      openTransition={springs.bouncy}
      {...props}
    />
  );
}

export type MorphDropdownMenuSubProps = Omit<
  Primitive.SubmenuRoot.Props,
  'actionsRef'
>;

/** Its own anchor scope, so the submenu grows out of its own row. */
function MorphDropdownMenuSub(props: MorphDropdownMenuSubProps) {
  const actionsRef = React.useRef<Primitive.Root.Actions | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);

  return (
    <MorphAnchorContext.Provider value={{ actionsRef, anchorRef }}>
      <Primitive.SubmenuRoot {...props} actionsRef={actionsRef} />
    </MorphAnchorContext.Provider>
  );
}

function MorphDropdownMenuSubTrigger({
  className,
  children,
  ...props
}: Primitive.SubmenuTrigger.Props) {
  const { anchorRef } = useMorphAnchor('MorphDropdownMenuSubTrigger');

  return (
    <Primitive.SubmenuTrigger
      openOnHover
      {...props}
      data-slot="morph-dropdown-menu-sub-trigger"
      className={cn(itemClassName(), 'pr-8', className)}
      render={(renderProps, state) => (
        <MorphItemSurface
          {...renderProps}
          ref={mergeRefs(anchorRef, renderProps.ref)}
          // Keeps the block on this row while the submenu it opened is showing.
          highlighted={state.highlighted || state.open}
        >
          <span className="min-w-0 flex-1 truncate">{children}</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={14}
            aria-hidden="true"
            className="absolute right-2 text-muted-fg"
          />
        </MorphItemSurface>
      )}
    />
  );
}

export type MorphDropdownMenuSubContentProps = Omit<
  MorphPopupProps,
  'contentSlot' | 'openTransition'
>;

function MorphDropdownMenuSubContent({
  side = 'right',
  sideOffset = 4,
  ...props
}: MorphDropdownMenuSubContentProps) {
  return (
    <MorphPopup
      contentSlot="morph-dropdown-menu-sub-content"
      // Submenus open while the pointer moves down the list, so they settle fast
      // instead of bouncing like the main menu.
      openTransition={springs.snappy}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

export type MorphDropdownMenuItemProps = Primitive.Item.Props & {
  variant?: MorphItemVariant;
};

function MorphDropdownMenuItem({
  className,
  children,
  variant = 'default',
  ...props
}: MorphDropdownMenuItemProps) {
  return (
    <Primitive.Item
      {...props}
      data-slot="morph-dropdown-menu-item"
      data-variant={variant}
      className={cn(itemClassName(variant), className)}
      render={(renderProps, state) => (
        <MorphItemSurface {...renderProps} highlighted={state.highlighted}>
          {children}
        </MorphItemSurface>
      )}
    />
  );
}

function MorphDropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: Primitive.CheckboxItem.Props) {
  return (
    <Primitive.CheckboxItem
      {...props}
      data-slot="morph-dropdown-menu-checkbox-item"
      className={cn(itemClassName(), 'pr-8', className)}
      render={(renderProps, state) => (
        <MorphItemSurface {...renderProps} highlighted={state.highlighted}>
          <span className="min-w-0 flex-1 truncate">{children}</span>
          <Primitive.CheckboxItemIndicator className={indicatorClassName}>
            <HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden="true" />
          </Primitive.CheckboxItemIndicator>
        </MorphItemSurface>
      )}
    />
  );
}

function MorphDropdownMenuRadioGroup({ ...props }: Primitive.RadioGroup.Props) {
  return (
    <Primitive.RadioGroup
      data-slot="morph-dropdown-menu-radio-group"
      {...props}
    />
  );
}

function MorphDropdownMenuRadioItem({
  className,
  children,
  ...props
}: Primitive.RadioItem.Props) {
  return (
    <Primitive.RadioItem
      {...props}
      data-slot="morph-dropdown-menu-radio-item"
      className={cn(itemClassName(), 'pr-8', className)}
      render={(renderProps, state) => (
        <MorphItemSurface {...renderProps} highlighted={state.highlighted}>
          <span className="min-w-0 flex-1 truncate">{children}</span>
          <Primitive.RadioItemIndicator className={indicatorClassName}>
            <HugeiconsIcon icon={Tick02Icon} size={14} aria-hidden="true" />
          </Primitive.RadioItemIndicator>
        </MorphItemSurface>
      )}
    />
  );
}

function MorphDropdownMenuGroup({ ...props }: Primitive.Group.Props) {
  return <Primitive.Group data-slot="morph-dropdown-menu-group" {...props} />;
}

function MorphDropdownMenuGroupLabel({
  className,
  ...props
}: Primitive.GroupLabel.Props) {
  return (
    <Primitive.GroupLabel
      data-slot="morph-dropdown-menu-group-label"
      className={cn('px-2 py-1.5 t-l-3 text-muted-fg', className)}
      {...props}
    />
  );
}

function MorphDropdownMenuSeparator({
  className,
  ...props
}: Primitive.Separator.Props) {
  return (
    <Primitive.Separator
      data-slot="morph-dropdown-menu-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function MorphDropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="morph-dropdown-menu-shortcut"
      className={cn('ml-auto t-b-4 tracking-widest text-muted-fg', className)}
      {...props}
    />
  );
}

export {
  MorphDropdownMenu,
  MorphDropdownMenuCheckboxItem,
  MorphDropdownMenuContent,
  MorphDropdownMenuGroup,
  MorphDropdownMenuGroupLabel,
  MorphDropdownMenuItem,
  MorphDropdownMenuRadioGroup,
  MorphDropdownMenuRadioItem,
  MorphDropdownMenuSeparator,
  MorphDropdownMenuShortcut,
  MorphDropdownMenuSub,
  MorphDropdownMenuSubContent,
  MorphDropdownMenuSubTrigger,
  MorphDropdownMenuTrigger,
};
