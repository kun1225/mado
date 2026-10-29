'use client';

import { Accordion as Primitive } from '@base-ui/react/accordion';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { motion, type HTMLMotionProps } from 'motion/react';
import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';
import { cn } from './cn';
import { springs } from './motion';

const RECEDED = { scale: 0.96, opacity: 0.65, blur: 1.5 };

type MorphRootContextValue = {
  gap: number;
  depth: boolean;
  openIndex: number | null;
  reportOpen: (index: number, open: boolean) => void;
};

const MorphRootContext = createContext<MorphRootContextValue | null>(null);

function useMorphRoot(part: string) {
  const context = use(MorphRootContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside <MorphAccordion>.`);
  }
  return context;
}

const MorphItemContext = createContext<{ open: boolean } | null>(null);

function useMorphItem(part: string) {
  const context = use(MorphItemContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside <MorphAccordionItem>.`);
  }
  return context;
}

export type MorphAccordionProps = Omit<
  Primitive.Root.Props,
  'render' | 'multiple'
> & {
  /** Divide rows that are both closed. Off leaves the stack as one blank card. */
  hasBorder?: boolean;
  /**
   * Push the rows that stayed closed into the background while another row is
   * open - smaller, dimmer and slightly out of focus. They stay clickable.
   */
  depth?: boolean;
  /** Pixels a neighbouring row moves clear of the open one. */
  gap?: number;
};

/**
 * The root owns the one thing an item cannot see for itself: which of its
 * siblings is open. Base UI hands an item the root's open `value`, but those
 * are item values - auto-generated ids unless you set them - so there is no way
 * back from one to a sibling's index. Items report their own state here on
 * layout instead, and the neighbours learn which way to move within the same
 * frame as the panel opens.
 *
 * One index rather than a set: `multiple` is off the public props, because a
 * row caught between two open rows can only be pushed one way and the gap would
 * open on one side of it while staying shut on the other.
 *
 * The divider reads `--poise-color-border` rather than `--color-border`: the
 * token file maps the Tailwind theme with `@theme inline`, so the theme names
 * only exist at build time and resolve to nothing at runtime.
 */
function MorphAccordion({
  className,
  hasBorder = true,
  depth = false,
  gap = 16,
  ...props
}: MorphAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Both halves bail by returning `current` untouched so React can skip the
  // re-render. On the closing half that check is also load-bearing: switching
  // rows closes one and opens another in the same commit, and a row may only
  // clear the slot it still holds.
  const reportOpen = useCallback((index: number, open: boolean) => {
    setOpenIndex((current) => {
      if (open) {
        return current === index ? current : index;
      }
      return current === index ? null : current;
    });
  }, []);

  const context = useMemo(
    () => ({ gap, depth, openIndex, reportOpen }),
    [gap, depth, openIndex, reportOpen],
  );

  return (
    <MorphRootContext value={context}>
      <Primitive.Root
        data-slot="morph-accordion"
        className={cn(
          'isolate w-full',
          hasBorder
            ? '[--morph-divider:var(--poise-color-border)]'
            : '[--morph-divider:transparent]',
          className,
        )}
        {...props}
      />
    </MorphRootContext>
  );
}

/**
 * Closed, the stack reads as a single card. Opening an item detaches it: it
 * rounds on all four corners and its neighbours slide clear by `gap`, leaving
 * the rows above and below sealed as cards of their own.
 *
 * Every border is present at every moment and only its colour changes, so none
 * of this shifts layout by the width of a border.
 */
const morphItem = cn(
  'relative border border-transparent bg-bg',
  'border-x-border border-t-(--morph-divider)',
  'first:rounded-t-2xl first:border-t-border last:rounded-b-2xl last:border-b-border',
  '[&:has(button:hover:not([data-disabled]))]:bg-muted',
  'data-open:z-1 data-open:rounded-2xl data-open:border-t-border data-open:border-b-border',
  '[&:has(+[data-open])]:rounded-b-2xl [&:has(+[data-open])]:border-b-border',
  '[[data-open]+&]:rounded-t-2xl [[data-open]+&]:border-t-border',
  'transition-[border-color,border-radius,background-color] duration-slow ease-standard',
);

export type MorphAccordionItemProps = Omit<Primitive.Item.Props, 'render'>;

function MorphAccordionItem({ className, ...props }: MorphAccordionItemProps) {
  return (
    <Primitive.Item
      data-slot="morph-accordion-item"
      className={cn(morphItem, className)}
      {...props}
      render={(renderProps, state) => (
        <MorphItemSurface
          {...renderProps}
          index={state.index}
          open={state.open}
        />
      )}
    />
  );
}

type MorphItemSurfaceProps = ComponentProps<'div'> & {
  index: number;
  open: boolean;
};

/**
 * A handful of DOM props - `onAnimationStart`, the drag handlers - mean
 * something else on a `motion` element. Base UI never passes them; assert past
 * the overlap rather than widening the parts' own props to Motion's.
 */
const asMotionProps = (props: ComponentProps<'div'>) =>
  props as HTMLMotionProps<'div'>;

/**
 * The gap is a transform rather than a margin, so the card you clicked stays
 * put under the pointer and only its neighbours move. The trade is that they
 * move outside the accordion's own box - leave room around it.
 */
function MorphItemSurface({
  index,
  open,
  children,
  ...props
}: MorphItemSurfaceProps) {
  const { gap, depth, openIndex, reportOpen } =
    useMorphRoot('MorphAccordionItem');

  // Layout, not passive: the report has to land before paint, or a neighbour
  // would start moving a frame after the panel it is moving away from.
  useLayoutEffect(() => {
    reportOpen(index, open);
    return () => reportOpen(index, false);
  }, [index, open, reportOpen]);

  // Which way the open row shoves this one: 1 down, -1 up, 0 not at all.
  const push = open || openIndex === null ? 0 : openIndex < index ? 1 : -1;
  const receded = depth && push !== 0;

  return (
    <motion.div
      {...asMotionProps(props)}
      initial={false}
      animate={{
        y: push * gap,
        scale: receded ? RECEDED.scale : 1,
        opacity: receded ? RECEDED.opacity : 1,
        ...(depth && {
          filter: receded ? `blur(${RECEDED.blur}px)` : 'blur(0px)',
        }),
      }}
      transition={springs.bouncy}
    >
      <MorphItemContext value={{ open }}>{children}</MorphItemContext>
    </motion.div>
  );
}

export type MorphAccordionTriggerProps = Omit<
  Primitive.Trigger.Props,
  'render'
> & {
  headerClassName?: string;
};

function MorphAccordionTrigger({
  className,
  headerClassName,
  children,
  ...props
}: MorphAccordionTriggerProps) {
  const { open } = useMorphItem('MorphAccordionTrigger');

  return (
    <Primitive.Header
      data-slot="morph-accordion-header"
      className={headerClassName}
    >
      <Primitive.Trigger
        data-slot="morph-accordion-trigger"
        className={cn(
          'group flex w-full cursor-pointer items-center gap-4 rounded-[inherit] px-4 py-3.5 text-left text-sm font-medium text-fg',
          'outline-2 -outline-offset-1 outline-transparent focus-visible:relative focus-visible:z-1 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'data-disabled:cursor-not-allowed data-disabled:text-muted-fg',
          'transition-[outline,outline-offset] duration-fast ease-standard',
          className,
        )}
        {...props}
      >
        <span className="flex-1">{children}</span>
        <motion.span
          aria-hidden="true"
          className="flex shrink-0"
          initial={false}
          animate={{ rotate: open ? 225 : 0 }}
          transition={springs.bouncy}
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            size={16}
            className="text-muted-fg opacity-70 transition-opacity duration-fast ease-standard group-hover:opacity-100"
          />
        </motion.span>
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export type MorphAccordionPanelProps = Omit<
  Primitive.Panel.Props,
  'render' | 'keepMounted'
>;

/**
 * Base UI decides when to unmount a panel by watching for a CSS transition on
 * it. There is none to find now, so it would tear the panel out before Motion
 * could animate it away. `keepMounted` hands that decision over: the element
 * stays, `hidden` is refused, and `inert` keeps a closed panel out of the
 * accessibility tree and off the tab order in its place.
 */
function MorphAccordionPanel({
  className,
  children,
  ...props
}: MorphAccordionPanelProps) {
  return (
    <Primitive.Panel
      keepMounted
      data-slot="morph-accordion-panel"
      className={cn('overflow-hidden text-sm text-muted-fg', className)}
      {...props}
      render={(renderProps, state) => (
        <motion.div
          {...asMotionProps(renderProps)}
          hidden={false}
          inert={!state.open}
          initial={false}
          animate={{ height: state.open ? 'auto' : 0 }}
          transition={springs.bouncy}
        >
          <motion.div
            className="px-4 pb-4"
            initial={false}
            animate={
              state.open
                ? { y: 0, opacity: 1, filter: 'blur(0px)' }
                : { y: 16, opacity: 0.4, filter: 'blur(4px)' }
            }
            transition={springs.bouncy}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    />
  );
}

export {
  MorphAccordion,
  MorphAccordionItem,
  MorphAccordionTrigger,
  MorphAccordionPanel,
};
