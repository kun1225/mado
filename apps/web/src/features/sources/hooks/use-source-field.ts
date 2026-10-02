import { useEffect, useState } from 'react';

import { useUpdateSource } from '../source-hooks';
import type { Source } from '../source-types';
import { updateSourceSchema } from '../source-types';

type TextField = 'name' | 'url' | 'note';

/**
 * A text field that saves when you leave it. A bad value shows its message and
 * is not saved, so the stored source is always valid.
 */
export function useSourceField(source: Source, field: TextField) {
  const saved = source[field] ?? '';
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const updateSourceMutation = useUpdateSource();

  useEffect(() => {
    setDraft(saved);
    setError(null);
  }, [saved, source.id]);

  function commit() {
    if (draft.trim() === saved) {
      setDraft(saved);
      setError(null);
      return;
    }

    const result = updateSourceSchema.shape[field].safeParse(draft);

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid value');
      return;
    }

    setError(null);
    updateSourceMutation.mutate(
      { id: source.id, input: { [field]: draft } },
      { onError: () => setError('Could not save. Try again.') },
    );
  }

  return { draft, setDraft, error, commit };
}
