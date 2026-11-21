import { useId, useState } from 'react';

import { Input } from '@repo/ui/input';

import { normalizeTagGroup } from '#/features/sources/source-tags';

/** Asks for a group name. Enter saves and Escape cancels. */
export function SettingsTagGroupName({
  label,
  initial = '',
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  onSubmit: (group: string) => void;
  onCancel: () => void;
}) {
  const errorId = useId();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const group = normalizeTagGroup(draft);
    if (group === null) {
      setError('Use a short word with no colon, like "style".');
      return;
    }
    onSubmit(group);
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <Input
        autoFocus
        value={draft}
        placeholder="Group name"
        aria-label={label}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') {
            // Escape would also close the settings dialog.
            event.stopPropagation();
            onCancel();
          }
        }}
        className="h-8 t-b-3 text-fg"
      />
      {error && (
        <p id={errorId} role="alert" className="t-b-4 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
