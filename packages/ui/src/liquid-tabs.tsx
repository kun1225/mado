'use client';

import { Tabs as Primitive } from '@base-ui/react/tabs';
import { eases, springs } from './motion';
import { cn } from './cn';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from 'motion/react';
import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react';

const LEAD = { type: 'spring', visualDuration: 0.2, bounce: 0.16 } as const;
const TRAIL = { type: 'spring', visualDuration: 0.4, bounce: 0.32 } as const;

const ICON_SIZE = 16;
const ICON_GAP = 6;
const LABEL_SHIFT = (ICON_SIZE + ICON_GAP) / 2;

const ICON_MOTION = {
  ...springs.snappy,
  opacity: eases.standard,
  filter: eases.standard,
} as const;
const NO_MOTION = { duration: 0 } as const;

export type LiquidTabsIcons = 'active' | 'all';
export type LiquidTabsIconPosition = 'start' | 'end';

type LiquidRootContextValue = {
  reportActive: (element: HTMLElement, active: boolean) => void;
  left: MotionValue<number>;
  right: MotionValue<number>;
  icons: LiquidTabsIcons;
  iconPosition: LiquidTabsIconPosition;
};

const LiquidRootContext = createContext<LiquidRootContextValue | null>(null);

function useLiquidRoot(part: string) {
  const context = use(LiquidRootContext);
  if (!context) {
    throw new Error(`<${part}> must be rendered inside <LiquidTabs>.`);
  }
  return context;
}

const clamp = (value: number, max: number) =>
  Math.min(Math.max(value, 0), Math.max(max, 0));

/** Horizontal only, because the stretch makes no sense in a column. */
export type LiquidTabsProps = Omit<
  Primitive.Root.Props,
  'render' | 'orientation'
> & {
  icons?: LiquidTabsIcons;
  iconPosition?: LiquidTabsIconPosition;
};

function LiquidTabs({
  className,
  icons = 'active',
  iconPosition = 'start',
  ...props
}: LiquidTabsProps) {
  const [activeElement, setActiveElement] = useState<HTMLElement | null>();
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const placed = useRef(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const reduced = useReducedMotion() ?? false;

  // Switching tabs turns one off and one on in the same commit,
  // so a tab may only clear the slot if it still holds it.
  const reportActive = useCallback((element: HTMLElement, active: boolean) => {
    setActiveElement((current) => {
      if (active) return current === element ? current : element;
      return current === element ? null : current;
    });
  }, []);

  useLayoutEffect(() => {
    const element = activeElement;
    if (!element) return;

    const settle = (sprung: boolean) => {
      const nextLeft = element.offsetLeft;
      const nextRight = nextLeft + element.offsetWidth;

      if (!sprung) {
        left.set(nextLeft);
        right.set(nextRight);
        return;
      }
      const forward = nextLeft > left.get();
      animate(left, nextLeft, forward ? TRAIL : LEAD);
      animate(right, nextRight, forward ? LEAD : TRAIL);
    };

    settle(placed.current && !reduced);
    placed.current = true;
    setIsPlaced(true);

    // ResizeObserver fires once right away with the size we just measured.
    // Skipping it keeps the stretch from being cut short.
    let observed = false;
    const observer = new ResizeObserver(() => {
      if (!observed) {
        observed = true;
        return;
      }
      settle(false);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [activeElement, reduced, left, right]);

  const context = useMemo(
    () => ({ reportActive, left, right, icons, iconPosition }),
    [reportActive, left, right, icons, iconPosition],
  );

  return (
    <LiquidRootContext value={context}>
      <Primitive.Root
        data-slot="liquid-tabs"
        data-placed={isPlaced ? '' : undefined}
        orientation="horizontal"
        className={cn('group/liquid isolate flex flex-col gap-2', className)}
        {...props}
      />
    </LiquidRootContext>
  );
}

export type LiquidTabsListProps = Omit<Primitive.List.Props, 'render'> & {
  children?: ReactNode;
};

function LiquidTabsList({
  className,
  children,
  ...props
}: LiquidTabsListProps) {
  const { left, right } = useLiquidRoot('LiquidTabsList');
  const width = useTransform([left, right], (latest: number[]) =>
    Math.max((latest[1] ?? 0) - (latest[0] ?? 0), 0),
  );

  return (
    <Primitive.List
      data-slot="liquid-tabs-list"
      className={cn('relative flex w-fit rounded-lg bg-bg p-1', className)}
      {...props}
    >
      <motion.span
        aria-hidden="true"
        data-slot="liquid-tabs-pill"
        className="pointer-events-none absolute inset-y-1 left-0 z-0 rounded-md bg-accent"
        style={{ x: left, width }}
      />
      {children}
    </Primitive.List>
  );
}

const liquidTabTrigger = cn(
  'relative z-1 flex h-9 cursor-pointer items-center justify-center rounded-md px-4 t-l-2 whitespace-nowrap text-muted-fg',
  'not-data-active:hover:text-fg',
  // Until the pill is measured (SSR + hydration), paint the active tab in CSS.
  'group-not-data-placed/liquid:data-active:bg-accent',
  'outline-2 outline-transparent focus-visible:outline-offset-2 focus-visible:outline-ring',
  'data-disabled:pointer-events-none data-disabled:text-muted-fg/50',
  'transition-colors duration-fast ease-standard',
);

export type LiquidTabsTriggerProps = Omit<Primitive.Tab.Props, 'render'> & {
  /** Only decoration, because the label already names the tab. */
  icon?: ReactNode;
};

function LiquidTabsTrigger({
  className,
  icon,
  ...props
}: LiquidTabsTriggerProps) {
  return (
    <Primitive.Tab
      data-slot="liquid-tabs-trigger"
      className={cn(liquidTabTrigger, className)}
      {...props}
      render={(renderProps, state) => (
        <LiquidTabSurface {...renderProps} active={state.active} icon={icon} />
      )}
    />
  );
}

/**
 * `motion` gives `onAnimationStart` and the drag handlers other types.
 * Base UI never passes them, so the cast is safe.
 */
const asMotionProps = (props: ComponentProps<'button'>) =>
  props as HTMLMotionProps<'button'>;

type LiquidTabSurfaceProps = ComponentProps<'button'> & {
  active: boolean;
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

type LiquidTabContentProps = {
  icon?: ReactNode;
  shown: boolean;
  position: LiquidTabsIconPosition;
  reduced: boolean;
  children?: ReactNode;
};

/**
 * Both label copies render this, so the accent copy moves with the plain one.
 *
 * The icon only scales, fades and blurs, and the label only moves. Nothing
 * changes layout, so the tab keeps its measured size.
 */
function LiquidTabContent({
  icon,
  shown,
  position,
  reduced,
  children,
}: LiquidTabContentProps) {
  if (!icon) return <>{children}</>;

  const transition = reduced ? NO_MOTION : ICON_MOTION;
  const iconNode = (
    <motion.span
      aria-hidden="true"
      data-slot="liquid-tabs-trigger-icon"
      className="flex shrink-0 origin-center items-center justify-center"
      style={{ width: ICON_SIZE, height: ICON_SIZE }}
      animate={
        shown
          ? { opacity: 1, scale: 1, filter: 'blur(0px)', x: 0 }
          : {
              opacity: 0,
              scale: 0.5,
              filter: 'blur(2px)',
              x: position === 'start' ? LABEL_SHIFT : -LABEL_SHIFT,
            }
      }
      // Start at the end state, so a hidden icon never flashes sharp before hydration.
      initial={false}
      transition={transition}
    >
      {icon}
    </motion.span>
  );

  return (
    <motion.span
      data-slot="liquid-tabs-trigger-content"
      className="flex items-center"
      style={{ gap: ICON_GAP }}
      animate={{
        x: shown ? 0 : position === 'start' ? -LABEL_SHIFT : LABEL_SHIFT,
      }}
      initial={false}
      transition={transition}
    >
      {position === 'start' && iconNode}
      {children}
      {position === 'end' && iconNode}
    </motion.span>
  );
}

/**
 * The label is drawn twice so the pill can clip the accent copy to a rectangle.
 */
function LiquidTabSurface({
  active,
  icon,
  ref,
  children,
  ...props
}: LiquidTabSurfaceProps) {
  const { reportActive, left, right, icons, iconPosition } =
    useLiquidRoot('LiquidTabsTrigger');
  const reduced = useReducedMotion() ?? false;
  const elementRef = useRef<HTMLButtonElement>(null);

  // Base UI re-registers the item when the ref changes, so the callback must stay the same.
  const forwarded = useRef<Ref<HTMLButtonElement> | undefined>(ref);
  forwarded.current = ref;
  const setRef = useCallback((element: HTMLButtonElement | null) => {
    elementRef.current = element;
    const next = forwarded.current;
    if (typeof next === 'function') next(element);
    else if (next) next.current = element;
  }, []);

  // The clip runs in its own frames, so it must read the latest value, not an old render's.
  const activeRef = useRef(active);
  useLayoutEffect(() => {
    activeRef.current = active;
  });

  // useLayoutEffect so the report lands before paint. Otherwise the pill moves a frame late.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!active || !element) return;
    reportActive(element, true);
    return () => reportActive(element, false);
  }, [active, reportActive]);

  const clipPath = useTransform([left, right], (latest: number[]) => {
    const [start = 0, end = 0] = latest;
    const element = elementRef.current;

    if (!element || end - start === 0) {
      return activeRef.current ? 'inset(0)' : 'inset(0 100% 0 0)';
    }

    const own = element.offsetLeft;
    const extent = element.offsetWidth;
    const near = clamp(start - own, extent);
    const far = clamp(own + extent - end, extent);
    return `inset(0 ${far}px 0 ${near}px)`;
  });

  const content = (
    <LiquidTabContent
      icon={icon}
      shown={icons === 'all' || active}
      position={iconPosition}
      reduced={reduced}
    >
      {children}
    </LiquidTabContent>
  );

  return (
    <motion.button {...asMotionProps(props)} ref={setRef}>
      {content}
      <motion.span
        aria-hidden="true"
        data-slot="liquid-tabs-highlight"
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-accent-fg"
        style={{ clipPath }}
      >
        {content}
      </motion.span>
    </motion.button>
  );
}

export type LiquidTabsPanelProps = Omit<Primitive.Panel.Props, 'render'>;

function LiquidTabsPanel({ className, ...props }: LiquidTabsPanelProps) {
  return (
    <Primitive.Panel
      data-slot="liquid-tabs-panel"
      className={cn('flex-1 t-b-3 outline-none', className)}
      {...props}
    />
  );
}

export { LiquidTabs, LiquidTabsList, LiquidTabsPanel, LiquidTabsTrigger };
