import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function SourceDetailChip({
  label,
  prefix,
  onRemove,
}: {
  label: string;
  /** A tag's facet, shown dimmed before the value. */
  prefix?: string;
  onRemove: () => void;
}) {
  const name = prefix ? `${prefix} ${label}` : label;

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 t-b-4 text-fg">
      <span className="truncate">
        {prefix && <span className="text-muted-fg">{prefix} · </span>}
        {label}
      </span>
      <button
        type="button"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
        className="flex size-4 items-center justify-center rounded-full text-muted-fg hover:text-fg"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.5} />
      </button>
    </span>
  );
}
