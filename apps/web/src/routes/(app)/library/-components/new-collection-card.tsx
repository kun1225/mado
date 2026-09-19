import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
      className="relative flex size-48 flex-col items-center justify-center gap-5 rounded-md border border-dashed border-border p-6 text-left text-muted-fg transition-colors hover:border-fg hover:text-fg"
    >
      <HugeiconsIcon icon={Add01Icon} size={32} strokeWidth={1.5} />
      <span className="absolute bottom-3 left-4 text-sm font-medium">
        {label}
      </span>
    </button>
  );
}
