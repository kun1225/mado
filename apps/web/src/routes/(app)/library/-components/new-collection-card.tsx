import { Add01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function NewCollectionCard({
  disabled,
  onClick,
}: {
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border-border text-muted-fg hover:border-fg hover:text-fg relative flex size-48 flex-col items-center justify-center gap-5 rounded-md border border-dashed p-6 text-left transition-colors"
    >
      <HugeiconsIcon icon={Add01Icon} size={32} strokeWidth={1.5} />
      <span className="absolute bottom-3 left-4 text-sm font-medium">
        New collection
      </span>
    </button>
  )
}
