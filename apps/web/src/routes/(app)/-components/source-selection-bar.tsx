import { Delete02Icon, RestoreBinIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';
import { Separator } from '@repo/ui/separator';
import {
  createTooltipHandle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

/**
 * One handle for every button in the bar, so the same bubble slides from one
 * icon to the next instead of closing and reopening.
 */
const selectionTooltip = createTooltipHandle<string>();

/**
 * Floats over the grid, so the wrapper has to let clicks through to the cards
 * behind it - only the pill itself takes pointer events.
 *
 * The labels name tools the user is already reaching for, so they open on
 * arrival rather than after the usual reading pause.
 */
export function SourceSelectionBar({
  count,
  onClear,
  onDelete,
  onRestore,
  isPending,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  /** Only the trash offers this, so the button is absent everywhere else. */
  onRestore?: () => void;
  isPending?: boolean;
}) {
  return (
    <TooltipProvider delay={120}>
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

          {onRestore && (
            <TooltipTrigger
              handle={selectionTooltip}
              payload="Put back"
              aria-label="Put back"
              onClick={onRestore}
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  className="rounded-full text-fg"
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
                size="icon-sm"
                disabled={isPending}
                className="rounded-full text-danger hover:bg-danger/10 hover:text-danger"
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
