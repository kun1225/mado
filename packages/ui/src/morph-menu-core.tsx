'use client';

import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';
import { Menu as Primitive } from '@base-ui/react/menu';
import { type Spring } from './motion';
import { cn } from 'cn';
import { motion } from 'motion/react';
import * as React from 'react';

type MorphSide = 'top' | 'bottom' | 'left' | 'right';

type MorphAlign = Primitive.Popup.State['align'];

const LIST_SLOT = 'morph-dropdown-menu-list';

type MorphAnchorContextValue = {
  actionsRef: React.RefObject<Primitive.Root.Actions | null>;
  anchorRef: React.RefObject<HTMLElement | null>;
};

const MorphAnchorContext = React.createContext<
  MorphAnchorContextValue | undefined
>(undefined);

/** Every submenu provides its own, so a popup always finds its own anchor. */
function useMorphAnchor(part: string) {
  const context = React.useContext(MorphAnchorContext);
  if (!context) {
    throw new Error(
      `<${part}> must be rendered inside <MorphDropdownMenu> or <MorphContextMenu>.`,
    );
  }
  return context;
}

const MorphOverlayContext = React.createContext<
  React.Dispatch<React.SetStateAction<HTMLElement | null>> | undefined
>(undefined);

type MorphPopupProps = Omit<Primitive.Popup.Props, 'className' | 'render'> & {
  align?: Primitive.Positioner.Props['align'];
  alignOffset?: number;
  className?: string;
  /** Lets a demo or test find this level's card. */
  contentSlot: string;
  /**
   * A context menu has no anchor element, only the pointer, so it grows out
   * of that point instead of out of a trigger.
   */
  growFrom?: 'anchor' | 'point';
  /** Submenus open much more often, so they use a tighter spring. */
  openTransition: Spring;
  /** A context menu must use its own positioner to follow the pointer. */
  Positioner?:
    typeof Primitive.Positioner | typeof ContextMenuPrimitive.Positioner;
  positionerClassName?: string;
  side?: MorphSide;
  sideOffset?: number;
};

function MorphPopup({
  align = 'start',
  alignOffset = 0,
  className,
  children,
  contentSlot,
  growFrom = 'anchor',
  openTransition,
  Positioner = Primitive.Positioner,
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
      <Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn('isolate z-popover', positionerClassName)}
      >
        <Primitive.Popup
          className="group/morph pointer-events-none relative transition-[opacity,filter] duration-middle ease-in-out-circ outline-none data-ending-style:opacity-0 data-ending-style:blur-sm data-starting-style:blur-sm"
          {...props}
          render={(
            { children: popupChildren, ref, style, ...renderProps },
            state,
          ) => {
            const physicalSide = toPhysicalSide(state.side);
            const collapsed =
              growFrom === 'point'
                ? POINT_POSE
                : collapsedPose(anchorRef.current, physicalSide, sideOffset);

            return (
              <div
                {...renderProps}
                ref={ref}
                style={{ ...style, ...naturalSize }}
              >
                <motion.div
                  className={cn(
                    'pointer-events-auto absolute overflow-hidden rounded-md border border-border bg-bg text-fg shadow-lg',
                    anchoredEdge(physicalSide, state.align),
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
      </Positioner>
    </Primitive.Portal>
  );
}

/** A row can be both anchor and surface, so it needs more than one ref. */
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
 * Measure the anchor itself, because `--anchor-width` reads back as text
 * and Motion needs a number.
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

const POINT_POSE = { width: 0, height: 0, x: 0, y: 0 };

/**
 * Pins the card to the corner nearest the anchor. Base UI flips `align` to
 * `end` near the screen edge, and then that corner moves to the other side.
 */
function anchoredEdge(side: MorphSide, align: MorphAlign) {
  const isEnd = align === 'end';

  switch (side) {
    case 'top':
      return isEnd ? 'bottom-0 right-0' : 'bottom-0 left-0';
    case 'bottom':
      return isEnd ? 'top-0 right-0' : 'top-0 left-0';
    case 'left':
      return isEnd ? 'bottom-0 right-0' : 'top-0 right-0';
    default:
      return isEnd ? 'bottom-0 left-0' : 'top-0 left-0';
  }
}

type MorphItemVariant = 'default' | 'danger';

/** Rows have no background, so the one overlay behind the list can slide between them. */
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

/** One shared block slides to the highlighted row, so moving down the menu feels like one surface. */
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
        // Stay in place when nothing is highlighted, so it fades out instead of jumping away.
        item ? 'opacity-100' : 'opacity-0',
        'transition-[background-color,height,left,opacity,top,width] duration-fast ease-standard',
      )}
      style={style}
    />
  );
}

export {
  indicatorClassName,
  itemClassName,
  mergeRefs,
  MorphAnchorContext,
  MorphItemSurface,
  MorphPopup,
  useMorphAnchor,
};
export type { MorphItemVariant, MorphPopupProps, MorphSide };
