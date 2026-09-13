"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";
import { eases, springs } from "./motion";
import { cn } from "cn";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from "motion/react";
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
} from "react";

const LEAD = { type: "spring", visualDuration: 0.2, bounce: 0.16 } as const;
const TRAIL = { type: "spring", visualDuration: 0.4, bounce: 0.32 } as const;

const ICON_SIZE = 16;
const ICON_GAP = 6;
const LABEL_SHIFT = (ICON_SIZE + ICON_GAP) / 2;

const ICON_MOTION = {
  ...springs.snappy,
  opacity: eases.standard,
  filter: eases.standard,
} as const;
const NO_MOTION = { duration: 0 } as const;

export type LiquidTabsIcons = "active" | "all";
export type LiquidTabsIconPosition = "start" | "end";

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

/** Horizontal only - the stretch has no meaning stacked. */
export type LiquidTabsProps = Omit<
  Primitive.Root.Props,
  "render" | "orientation"
> & {
  icons?: LiquidTabsIcons;
  iconPosition?: LiquidTabsIconPosition;
};

function LiquidTabs({
  className,
  icons = "active",
  iconPosition = "start",
  ...props
}: LiquidTabsProps) {
  const [activeElement, setActiveElement] = useState<HTMLElement | null>();
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const placed = useRef(false);
  const reduced = useReducedMotion() ?? false;

  // Switching tabs deactivates one and activates another in the same commit,
  // so a tab may only clear the slot it still holds.
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

    // A ResizeObserver reports once on observe, and that call is the
    // measurement just taken - letting it through would cut the stretch short.
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
        orientation="horizontal"
        className={cn("isolate flex flex-col gap-2", className)}
        {...props}
      />
    </LiquidRootContext>
  );
}

export type LiquidTabsListProps = Omit<Primitive.List.Props, "render"> & {
  children?: ReactNode;
};

function LiquidTabsList({
  className,
  children,
  ...props
}: LiquidTabsListProps) {
  const { left, right } = useLiquidRoot("LiquidTabsList");
  const width = useTransform([left, right], (latest: number[]) =>
    Math.max((latest[1] ?? 0) - (latest[0] ?? 0), 0),
  );

  return (
    <Primitive.List
      data-slot="liquid-tabs-list"
      className={cn("bg-muted relative flex w-fit rounded-lg p-1", className)}
      {...props}
    >
      <motion.span
        aria-hidden="true"
        data-slot="liquid-tabs-pill"
        className="bg-accent pointer-events-none absolute inset-y-1 left-0 z-0 rounded-md"
        style={{ x: left, width }}
      />
      {children}
    </Primitive.List>
  );
}

const liquidTabTrigger = cn(
  "text-muted-fg relative z-1 flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium whitespace-nowrap",
  "not-data-active:hover:text-fg",
  "focus-visible:outline-ring outline-2 outline-transparent focus-visible:outline-offset-2",
  "data-disabled:text-muted-fg/50 data-disabled:pointer-events-none",
  "duration-fast ease-standard transition-colors",
);

export type LiquidTabsTriggerProps = Omit<Primitive.Tab.Props, "render"> & {
  /** Decorative - the label names the tab. */
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
 * `onAnimationStart` and the drag handlers mean something else on a `motion`
 * element. Base UI never passes them, so assert past the overlap.
 */
const asMotionProps = (props: ComponentProps<"button">) =>
  props as HTMLMotionProps<"button">;

type LiquidTabSurfaceProps = ComponentProps<"button"> & {
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
 * Both copies of the label render this, so the accent copy travels with the
 * plain one and the pill keeps clipping the same shape.
 *
 * The icon only ever scales, fades and blurs, and the label only translates -
 * nothing here touches layout, so the tab box stays the size it was measured
 * at.
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
          ? { opacity: 1, scale: 1, filter: "blur(0px)", x: 0 }
          : {
              opacity: 0,
              scale: 0.5,
              filter: "blur(2px)",
              x: position === "start" ? LABEL_SHIFT : -LABEL_SHIFT,
            }
      }
      // Renders the target on the server and on mount, so a hidden icon is
      // never painted sharp for a frame before hydration reaches it.
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
        x: shown ? 0 : position === "start" ? -LABEL_SHIFT : LABEL_SHIFT,
      }}
      initial={false}
      transition={transition}
    >
      {position === "start" && iconNode}
      {children}
      {position === "end" && iconNode}
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
    useLiquidRoot("LiquidTabsTrigger");
  const reduced = useReducedMotion() ?? false;
  const elementRef = useRef<HTMLButtonElement>(null);

  // Base UI's composite list re-registers the item whenever the ref detaches,
  // so the callback has to keep its identity across renders.
  const forwarded = useRef<Ref<HTMLButtonElement> | undefined>(ref);
  forwarded.current = ref;
  const setRef = useCallback((element: HTMLButtonElement | null) => {
    elementRef.current = element;
    const next = forwarded.current;
    if (typeof next === "function") next(element);
    else if (next) next.current = element;
  }, []);

  // The clip runs on frames of its own, and would otherwise read whichever
  // render built it.
  const activeRef = useRef(active);
  useLayoutEffect(() => {
    activeRef.current = active;
  });

  // Layout, not passive: the report has to land before paint, or the pill
  // would start moving a frame late.
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
      return activeRef.current ? "inset(0)" : "inset(0 100% 0 0)";
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
      shown={icons === "all" || active}
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
        className="text-accent-fg pointer-events-none absolute inset-0 flex items-center justify-center px-4"
        style={{ clipPath }}
      >
        {content}
      </motion.span>
    </motion.button>
  );
}

export type LiquidTabsPanelProps = Omit<Primitive.Panel.Props, "render">;

function LiquidTabsPanel({ className, ...props }: LiquidTabsPanelProps) {
  return (
    <Primitive.Panel
      data-slot="liquid-tabs-panel"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { LiquidTabs, LiquidTabsList, LiquidTabsPanel, LiquidTabsTrigger };
