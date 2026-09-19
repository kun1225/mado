'use client';

import { Menu as Primitive } from '@base-ui/react/menu';
import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { springs, type Spring } from './motion';
import { cn } from 'cn';
import { motion } from 'motion/react';
import * as React from 'react';

/** The four physical sides a popup can grow out from. */
type MorphSide = 'top' | 'bottom' | 'left' | 'right';

/** The scroll box every item measures against. */
const LIST_SLOT = 'morph-dropdown-menu-list';

type MorphAnchorContextValue = {
  /** Lets the popup unmount itself once the closing animation settles. */
  actionsRef: React.RefObject<Primitive.Root.Actions | null>;
  /** The element the popup grows out of: the trigger, or a submenu's row. */
  anchorRef: React.RefObject<HTMLElement | null>;
};

const MorphAnchorContext = React.createContext<
  MorphAnchorContextValue | undefined
>(undefined);

/** Every submenu provides its own, so a popup always finds its own anchor. */
function useMorphAnchor(part: string) {
  const context = React.useContext(MorphAnchorContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside <MorphDropdownMenu>.`);
  }
  return context;
}

/** How an item hands itself to the overlay that follows the highlight. */
const MorphOverlayContext = React.createContext<
  React.Dispatch<React.SetStateAction<HTMLElement | null>> | undefined
>(undefined);

/** Points every ref at one element - a row can be both anchor and surface. */
const mergeRefs =
  <T,>(...refs: (React.Ref<T> | undefined)[]) =>
  (element: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    }
  };

/** Base UI may report a logical side; the pose maths needs a physical one. */
function toPhysicalSide(side: Primitive.Popup.State['side']): MorphSide {
  if (side === 'inline-start') return 'left';
  if (side === 'inline-end') return 'right';
  return side;
}

/**
 * The card's box while it is still wearing the anchor's shape. Measured off the
 * anchor rather than `--anchor-width` / `--anchor-height`: custom properties
 * read back unresolved, and Motion needs a number.
 */
function collapsedPose(
  anchor: HTMLElement | null,
  side: MorphSide,
  sideOffset: number,
) {
  const width = anchor?.offsetWidth ?? 0;
  const height = anchor?.offsetHeight ?? 0;

  switch (side) {
    case 'top':
      return { width, height, x: 0, y: height + sideOffset };
    case 'bottom':
      return { width, height, x: 0, y: -(height + sideOffset) };
    case 'left':
      return { width, height, x: width + sideOffset, y: 0 };
    default:
      return { width, height, x: -(width + sideOffset), y: 0 };
  }
}

/** Pins the growing card to the edge that faces the anchor. */
function anchoredEdge(side: MorphSide) {
  switch (side) {
    case 'top':
      return 'bottom-0 left-0';
    case 'left':
      return 'top-0 right-0';
    default:
      return 'top-0 left-0';
  }
}

export type MorphDropdownMenuProps = Omit<Primitive.Root.Props, 'actionsRef'>;

/**
 * `actionsRef` lets the popup unmount itself once the closing animation
 * settles. The popup's CSS fade gives Base UI an exit animation to observe.
 */
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
        'group relative flex h-10 w-fit min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg',
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

type MorphPopupProps = Omit<Primitive.Popup.Props, 'className' | 'render'> & {
  align?: Primitive.Positioner.Props['align'];
  alignOffset?: number;
  className?: string;
  /** Names the measured card, so a demo or test can reach for one level. */
  contentSlot: string;
  /** The spring the card grows on. Submenus open far more often, so they
   * settle on a tighter one. */
  openTransition: Spring;
  positionerClassName?: string;
  side?: MorphSide;
  sideOffset?: number;
};

/**
 * The card shared by the menu and every submenu: it starts out wearing the
 * anchor's box and grows into the size the content wants.
 */
function MorphPopup({
  align = 'start',
  alignOffset = 0,
  className,
  children,
  contentSlot,
  openTransition,
  positionerClassName,
  side = 'bottom',
  sideOffset = 6,
  ...props
}: MorphPopupProps) {
  const { actionsRef, anchorRef } = useMorphAnchor(contentSlot);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = React.useState<{
    width: number;
    height: number;
  }>();
  const [highlightedItem, setHighlightedItem] =
    React.useState<HTMLElement | null>(null);

  const measureContent = React.useCallback((element: HTMLDivElement | null) => {
    contentRef.current = element;
    if (!element) return;

    const update = () =>
      setNaturalSize((current) =>
        current?.width === element.offsetWidth &&
        current?.height === element.offsetHeight
          ? current
          : { width: element.offsetWidth, height: element.offsetHeight },
      );

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);

    return () => {
      contentRef.current = null;
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Primitive.Portal>
      <Primitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn('isolate z-40', positionerClassName)}
      >
        <Primitive.Popup
          className="group/morph pointer-events-none relative transition-[opacity,filter] duration-middle ease-in-out-circ outline-none data-ending-style:opacity-0 data-ending-style:blur-sm data-starting-style:blur-sm"
          {...props}
          render={(
            { children: popupChildren, ref, style, ...renderProps },
            state,
          ) => {
            const physicalSide = toPhysicalSide(state.side);
            const collapsed = collapsedPose(
              anchorRef.current,
              physicalSide,
              sideOffset,
            );

            return (
              <div
                {...renderProps}
                ref={ref}
                style={{ ...style, ...naturalSize }}
              >
                <motion.div
                  className={cn(
                    'pointer-events-auto absolute overflow-hidden rounded-md border border-border bg-bg text-fg shadow-lg',
                    anchoredEdge(physicalSide),
                    'transition-shadow duration-slower ease-standard',
                    'group-data-starting-style/morph:shadow-transparent',
                    'group-data-ending-style/morph:shadow-transparent',
                  )}
                  initial={collapsed}
                  animate={
                    state.open && naturalSize
                      ? { ...naturalSize, x: 0, y: 0 }
                      : collapsed
                  }
                  transition={openTransition}
                  // The spring, not the exit fade, decides when it goes.
                  onAnimationComplete={() => {
                    if (!state.open) actionsRef.current?.unmount();
                  }}
                >
                  {popupChildren}
                </motion.div>
              </div>
            );
          }}
        >
          <div
            ref={measureContent}
            data-slot={contentSlot}
            className={cn(
              'relative w-max max-w-(--available-width) min-w-32 p-1',
              className,
            )}
          >
            <MorphItemOverlay popupRef={contentRef} item={highlightedItem} />
            <MorphOverlayContext.Provider value={setHighlightedItem}>
              <div
                data-slot={LIST_SLOT}
                className="relative z-10 max-h-[min(18rem,var(--available-height))] scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain"
              >
                {children}
              </div>
            </MorphOverlayContext.Provider>
          </div>
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
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
      // A submenu rides the pointer down the list, so it lands rather than
      // rings the way the menu below the trigger can afford to.
      openTransition={springs.snappy}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

export type MorphItemVariant = 'default' | 'danger';

/**
 * Rows paint no background of their own: the one overlay behind the list does,
 * so it can slide from row to row.
 */
const itemClassName = (variant: MorphItemVariant = 'default') =>
  cn(
    'relative flex h-9 cursor-default items-center gap-2 rounded-sm px-2 text-sm text-fg outline-none select-none',
    variant === 'danger' && 'text-danger',
    'data-disabled:pointer-events-none data-disabled:text-muted-fg',
    'transition-colors duration-fast ease-standard',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  );

const indicatorClassName = cn(
  'absolute right-2 flex items-center text-muted-fg',
  'transition-[opacity,scale] duration-base ease-in-out',
  'data-starting-style:scale-50 data-starting-style:opacity-0',
  'data-ending-style:scale-50 data-ending-style:opacity-0',
);

/** Hands the row's element to the overlay for as long as it is highlighted. */
function MorphItemSurface({
  children,
  highlighted,
  ref,
  ...props
}: Omit<React.ComponentPropsWithRef<'div'>, 'ref'> & {
  highlighted: boolean;
  ref?: React.Ref<HTMLElement>;
}) {
  const itemRef = React.useRef<HTMLElement>(null);
  const setHighlightedItem = React.useContext(MorphOverlayContext);

  React.useLayoutEffect(() => {
    const element = itemRef.current;
    if (!element || !setHighlightedItem || !highlighted) return;

    setHighlightedItem(element);

    return () =>
      setHighlightedItem((current) => (current === element ? null : current));
  }, [highlighted, setHighlightedItem]);

  return (
    <div {...props} ref={mergeRefs(itemRef, ref)}>
      {children}
    </div>
  );
}

/**
 * One background block shared by every row. It slides to whichever item is
 * highlighted instead of each row painting its own, so hovering down the menu
 * reads as a single moving surface.
 */
function MorphItemOverlay({
  popupRef,
  item,
}: {
  popupRef: React.RefObject<HTMLDivElement | null>;
  item: HTMLElement | null;
}) {
  const [style, setStyle] = React.useState<React.CSSProperties>();

  React.useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!popup || !item) return;

    const scrollContainer = item.closest<HTMLElement>(
      `[data-slot="${LIST_SLOT}"]`,
    );
    if (!scrollContainer) return;

    const update = () => {
      setStyle({
        height: item.offsetHeight,
        left: scrollContainer.offsetLeft + item.offsetLeft,
        top:
          scrollContainer.offsetTop +
          item.offsetTop -
          scrollContainer.scrollTop,
        transform: 'translateZ(0)',
        width: item.offsetWidth,
      });
    };

    update();
    scrollContainer.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(popup);
    resizeObserver.observe(scrollContainer);
    resizeObserver.observe(item);

    return () => {
      scrollContainer.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      resizeObserver.disconnect();
    };
  }, [item, popupRef]);

  if (!style) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute z-0 rounded-sm',
        item?.dataset.variant === 'danger' ? 'bg-danger/15' : 'bg-muted',
        // Held in place while nothing is highlighted, so the pointer leaving
        // fades the block out rather than snapping it away.
        item ? 'opacity-100' : 'opacity-0',
        'transition-[background-color,height,left,opacity,top,width] duration-fast ease-standard',
      )}
      style={style}
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
      className={cn('px-2 py-1.5 text-xs font-medium text-muted-fg', className)}
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
      className={cn('ml-auto text-xs tracking-widest text-muted-fg', className)}
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
