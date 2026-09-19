import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import type { ToggleSelectOptions } from '#/features/sources/hooks/use-source-selection';

export function SourceCardCheckbox({
  fileName,
  isSelected,
  isSelectionMode,
  onToggle,
}: {
  fileName: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggle: (options: ToggleSelectOptions) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Select ${fileName}`}
      onClick={(event) => onToggle({ isRange: event.shiftKey })}
      className={cn(
        'absolute top-1 left-1 z-20 mt-0.5 flex size-7 items-center justify-center rounded-full border outline-none',
        'transition-[opacity,background-color,border-color,color] duration-base ease-standard',
        'focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50',
        isSelected
          ? 'border-fg bg-fg text-bg'
          : 'border-bg/70 bg-fg/40 text-transparent backdrop-blur-xs hover:bg-bg/40',
        isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
    >
      <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
    </button>
  );
}
