import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function SourceDetailChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs text-fg">
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="flex size-4 items-center justify-center rounded-full text-muted-fg hover:text-fg"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.5} />
      </button>
    </span>
  );
}
