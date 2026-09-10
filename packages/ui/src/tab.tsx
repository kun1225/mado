"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";
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

/**
 * The edge moving into open space, and the one dragged after it. The distance
 * between them during the crossing is the whole effect, so they are a pair -
 * closing the gap between these two numbers flattens it back to a slide.
 */
const LEAD = { type: "spring", visualDuration: 0.2, bounce: 0.16 } as const;
const TRAIL = { type: "spring", visualDuration: 0.4, bounce: 0.28 } as const;

type LiquidRootContextValue = {
  reportActive: (element: HTMLElement, active: boolean) => void;
  left: MotionValue<number>;
  right: MotionValue<number>;
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
>;

/**
 * Base UI can name the active tab but not place it among its siblings, so the
 * active tab reports its own element here and the pill measures against it.
 * The two edges stay motion values so the labels can clip against them per
 * frame without re-rendering.
 */
function LiquidTabs({ className, ...props }: LiquidTabsProps) {
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
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
    () => ({ reportActive, left, right }),
    [reportActive, left, right],
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
      {/*
       * One element for the whole strip rather than a fill per tab: mid-travel
       * the pill spans two tabs, and per-tab fills would round their touching
       * edges and split it in half.
       */}
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

export type LiquidTabsTriggerProps = Omit<Primitive.Tab.Props, "render">;

function LiquidTabsTrigger({ className, ...props }: LiquidTabsTriggerProps) {
  return (
    <Primitive.Tab
      data-slot="liquid-tabs-trigger"
      className={cn(liquidTabTrigger, className)}
      {...props}
      render={(renderProps, state) => (
        <LiquidTabSurface {...renderProps} active={state.active} />
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
  ref?: Ref<HTMLButtonElement>;
};

/**
 * The label is drawn twice so the pill can clip the accent copy to a
 * rectangle: a colour swap would flip a whole label at once, where a clip lets
 * the stretched fill's edge cut the letters as it passes.
 */
function LiquidTabSurface({
  active,
  ref,
  children,
  ...props
}: LiquidTabSurfaceProps) {
  const { reportActive, left, right } = useLiquidRoot("LiquidTabsTrigger");
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

    // Nothing measured yet - on the server, and before the first layout.
    // Lighting the active tab whole is what the measurement will confirm.
    if (!element || end - start === 0) {
      return activeRef.current ? "inset(0)" : "inset(0 100% 0 0)";
    }

    const own = element.offsetLeft;
    const extent = element.offsetWidth;
    const near = clamp(start - own, extent);
    const far = clamp(own + extent - end, extent);
    return `inset(0 ${far}px 0 ${near}px)`;
  });

  return (
    <motion.button {...asMotionProps(props)} ref={setRef}>
      {children}
      <motion.span
        aria-hidden="true"
        data-slot="liquid-tabs-highlight"
        className="text-accent-fg pointer-events-none absolute inset-0 flex items-center justify-center px-4"
        style={{ clipPath }}
      >
        {children}
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
