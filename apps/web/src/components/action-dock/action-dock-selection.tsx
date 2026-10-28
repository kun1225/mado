import { Delete02Icon, RestoreBinIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';
import { Separator } from '@repo/ui/separator';
import {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

import { FLOATING_BAR } from '.';

const selectionTooltip = createTooltipHandle<string>();

/**
 * It floats over the grid, so only the pill takes clicks. Other clicks reach the cards below.
 *
 * Tooltips open right away, because the user is already reaching for these tools.
 */
export function ActionDockSelection({
  count,
  onClear,
  onDelete,
  onRestore,
  isPending,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  /** Only the trash passes this, so the button is hidden everywhere else. */
  onRestore?: () => void;
  isPending?: boolean;
}) {
  return (
    <TooltipProvider delay={120}>
      {/* The dock looks for this attribute to move out of the way. */}
      <div
        data-source-selection-bar
        className="pointer-events-none fixed inset-x-0 bottom-6 z-action-bar flex justify-center px-edge"
      >
        <div
          className={cn(
            FLOATING_BAR,
            'pointer-events-auto relative animate-in duration-slow ease-out-back fade-in-0 slide-in-from-bottom-2',
          )}
        >
          <p className="t-l-2 text-fg">{count} selected</p>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="rounded-full text-muted-fg"
          >
            Clear
          </Button>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {onRestore && (
            <TooltipTrigger
              handle={selectionTooltip}
              payload="Put back"
              aria-label="Put back"
              onClick={onRestore}
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  className="hit-area-1 rounded-full text-fg"
                />
              }
            >
              <HugeiconsIcon
                icon={RestoreBinIcon}
                size={16}
                strokeWidth={1.5}
              />
            </TooltipTrigger>
          )}

          <TooltipTrigger
            handle={selectionTooltip}
            payload="Delete"
            aria-label="Delete"
            onClick={onDelete}
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                className="hit-area-1 rounded-full text-danger hover:bg-danger/10 hover:text-danger"
              />
            }
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
          </TooltipTrigger>
        </div>

        <Tooltip handle={selectionTooltip}>
          {({ payload }) => <TooltipContent>{payload}</TooltipContent>}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
