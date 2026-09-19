import {
  Add01Icon,
  Image01FreeIcons,
  VideoReplayIcon,
  WebDesign01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

const TILE_CLASS = cn(
  'absolute flex size-11 scale-75 items-center justify-center rounded-sm border border-border bg-bg text-muted-fg opacity-0 shadow-md transition-[translate,rotate,scale,opacity] duration-fast ease-out-back',
  'group-hover:scale-100 group-hover:opacity-100 group-hover:duration-middle',
);

export function NewCollectionCard({
  label = 'New collection',
  disabled,
  onClick,
}: {
  label?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative flex size-48 flex-col items-center justify-center rounded-md border border-dashed border-border p-6 text-left text-muted-fg',
        'transition-colors duration-fast hover:border-fg hover:text-fg',
      )}
    >
      <span
        className={cn(
          'transition-[opacity,scale] delay-100 duration-base ease-out-quart',
          'group-hover:scale-60 group-hover:opacity-0 group-hover:delay-0',
        )}
      >
        <HugeiconsIcon icon={Add01Icon} size={32} strokeWidth={1.5} />
      </span>

      <span
        aria-hidden
        className={cn(
          TILE_CLASS,
          'translate-y-2 group-hover:-translate-x-9 group-hover:translate-y-0 group-hover:rotate-[-14deg] group-hover:delay-100',
        )}
      >
        <HugeiconsIcon icon={Image01FreeIcons} size={20} strokeWidth={1.5} />
      </span>
      <span
        aria-hidden
        className={cn(
          TILE_CLASS,
          'group-hover:-translate-y-3 group-hover:delay-120',
        )}
      >
        <HugeiconsIcon icon={VideoReplayIcon} size={20} strokeWidth={1.5} />
      </span>
      <span
        aria-hidden
        className={cn(
          TILE_CLASS,
          'translate-y-2 group-hover:translate-x-9 group-hover:translate-y-0 group-hover:rotate-14 group-hover:delay-140',
        )}
      >
        <HugeiconsIcon icon={WebDesign01Icon} size={20} strokeWidth={1.5} />
      </span>

      <span className="absolute bottom-3 left-4 line-clamp-1 text-sm font-medium">
        {label}
      </span>
    </button>
  );
}
