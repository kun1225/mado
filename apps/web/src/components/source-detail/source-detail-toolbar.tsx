import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  SidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';
import { DialogClose } from '@repo/ui/dialog';

// Hover must stay light-on-dark: the default ghost hover assumes a light page.
const TOOLBAR_BUTTON =
  'text-bg hover:bg-bg/15 hover:text-bg aria-expanded:bg-bg/15 aria-expanded:text-bg';

export function SourceDetailToolbar({
  position,
  total,
  onPrevious,
  onNext,
  onDownload,
  onDelete,
  isDeleting,
  isPanelOpen,
  onTogglePanel,
}: {
  position: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onDownload?: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-edge text-bg">
      <Button
        variant="ghost"
        size="icon-sm"
        className={TOOLBAR_BUTTON}
        aria-label="Previous source"
        disabled={!onPrevious}
        onClick={onPrevious}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
      </Button>
      <span className="text-xs tabular-nums">
        {position} / {total}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className={TOOLBAR_BUTTON}
        aria-label="Next source"
        disabled={!onNext}
        onClick={onNext}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {onDownload && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={TOOLBAR_BUTTON}
            aria-label="Download"
            onClick={onDownload}
          >
            <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.5} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className={TOOLBAR_BUTTON}
          aria-label="Delete"
          disabled={isDeleting}
          onClick={onDelete}
        >
          <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isPanelOpen ? 'Hide details' : 'Show details'}
          aria-expanded={isPanelOpen}
          className={TOOLBAR_BUTTON}
          onClick={onTogglePanel}
        >
          <HugeiconsIcon icon={SidebarRightIcon} size={18} strokeWidth={1.5} />
        </Button>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              className={TOOLBAR_BUTTON}
            />
          }
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} />
        </DialogClose>
      </div>
    </header>
  );
}
