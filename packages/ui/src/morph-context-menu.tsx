'use client';

import { ContextMenu as Primitive } from '@base-ui/react/context-menu';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { springs } from './motion';
import {
  MorphAnchorContext,
  MorphPopup,
  type MorphPopupProps,
} from './morph-menu-core';
import { cn } from './cn';
import * as React from 'react';

export type MorphContextMenuProps = Omit<Primitive.Root.Props, 'actionsRef'>;

/** Same shell as `MorphDropdownMenu`, but it opens at the pointer on right-click or long press. */
function MorphContextMenu(props: MorphContextMenuProps) {
  const actionsRef = React.useRef<MenuPrimitive.Root.Actions | null>(null);
  const anchorRef = React.useRef<HTMLElement | null>(null);

  return (
    <MorphAnchorContext.Provider value={{ actionsRef, anchorRef }}>
      <Primitive.Root {...props} actionsRef={actionsRef} />
    </MorphAnchorContext.Provider>
  );
}

function MorphContextMenuTrigger({
  className,
  ...props
}: Primitive.Trigger.Props) {
  return (
    <Primitive.Trigger
      data-slot="morph-context-menu-trigger"
      // A long press must not select text or open the iOS link preview.
      className={cn('select-none [-webkit-touch-callout:none]', className)}
      {...props}
    />
  );
}

export type MorphContextMenuContentProps = Omit<
  MorphPopupProps,
  'contentSlot' | 'growFrom' | 'openTransition' | 'Positioner'
>;

function MorphContextMenuContent({
  sideOffset = 2,
  ...props
}: MorphContextMenuContentProps) {
  return (
    <MorphPopup
      contentSlot="morph-context-menu-content"
      growFrom="point"
      openTransition={springs.bouncy}
      Positioner={Primitive.Positioner}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

export { MorphContextMenu, MorphContextMenuContent, MorphContextMenuTrigger };
// Base UI's context menu uses the same item parts as its menu.
export {
  MorphDropdownMenuGroup as MorphContextMenuGroup,
  MorphDropdownMenuGroupLabel as MorphContextMenuGroupLabel,
  MorphDropdownMenuItem as MorphContextMenuItem,
  MorphDropdownMenuSeparator as MorphContextMenuSeparator,
} from './morph-dropdown-menu';
