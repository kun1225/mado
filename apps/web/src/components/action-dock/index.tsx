import { cn } from 'cn';

import { useHideOnScroll } from '#/hooks/use-hide-on-scroll';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

import { ActionDockAddSource } from './action-dock-add-source';
import { ActionDockSearch } from './action-dock-search';

const HIDE_AFTER_SCROLL_PX = 200;

export function ActionDock({
  addSource,
}: {
  addSource?: { collectionId: string | null };
}) {
  // A dock that pops in and out on every scroll is the kind of motion reduced-motion users opt out of.
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPastScroll = useHideOnScroll(HIDE_AFTER_SCROLL_PX);
  const isScrolledAway = isPastScroll && !prefersReducedMotion;

  return (
    <div
      data-scrolled-away={isScrolledAway || undefined}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-action-bar flex items-end justify-center gap-3 px-edge',
        'transition-[translate,opacity,visibility] duration-slow ease-out',
        'selecting:invisible selecting:translate-y-[calc(100%+1.5rem)] selecting:opacity-0 motion-reduce:selecting:translate-y-0',
        // Focus inside means the user is typing or in a menu, so the dock must not slide away under them.
        'data-scrolled-away:not-focus-within:invisible data-scrolled-away:not-focus-within:translate-y-[calc(100%+1.5rem)] data-scrolled-away:not-focus-within:opacity-0',
      )}
    >
      {addSource && (
        <ActionDockAddSource collectionId={addSource.collectionId} />
      )}
      <ActionDockSearch />
    </div>
  );
}

export const FLOATING_SURFACE = cn(
  'border border-border bg-bg/80 shadow-md backdrop-blur-xl',
);

export const FLOATING_BAR = cn(
  FLOATING_SURFACE,
  'flex h-12 items-center gap-1 rounded-full pr-1.5 pl-4',
);
