import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';
import { Separator } from '@repo/ui/separator';

/**
 * Floats over the grid, so the wrapper has to let clicks through to the cards
 * behind it - only the pill itself takes pointer events.
 */
export function SourceSelectionBar({
  count,
  onClear,
  onDelete,
  isDeleting,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-action-bar flex justify-center px-edge">
      <div className="pointer-events-auto relative flex animate-in items-center gap-1 rounded-full border border-border bg-bg py-2 pr-2 pl-4 shadow-md duration-slow ease-out-back fade-in-0 slide-in-from-bottom-2">
        <p className="text-sm font-medium text-fg">{count} selected</p>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="rounded-full text-muted-fg"
        >
          Clear
        </Button>

        <Separator orientation="vertical" />

        <Button
          variant="ghost"
          size="sm"
          disabled={isDeleting}
          onClick={onDelete}
          className="rounded-full text-danger hover:bg-danger/10 hover:text-danger"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
