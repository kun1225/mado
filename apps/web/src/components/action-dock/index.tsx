import { cn } from 'cn';

import { ActionDockAddSource } from './action-dock-add-source';
import { ActionDockSearch } from './action-dock-search';

export function ActionDock({
  addSource,
}: {
  addSource?: { collectionId: string | null };
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-action-bar flex items-end justify-center gap-3 px-edge',
        'transition-[translate,opacity,visibility] duration-slow ease-out-quart motion-reduce:duration-fast',
        'selecting:invisible selecting:translate-y-[calc(100%+1.5rem)] selecting:opacity-0 motion-reduce:selecting:translate-y-0',
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
