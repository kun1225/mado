import { useState } from 'react';

import { useUpdateSource } from '../source-hooks';
import type { Source } from '../source-types';
import { updateSourceSchema } from '../source-types';

type TextField = 'name' | 'url' | 'note';

type FieldEdit = {
  sourceId: string;
  saved: string;
  draft: string;
  error: string | null;
};

/**
 * A text field that saves when you leave it. A bad value shows its message and
 * is not saved, so the stored source is always valid.
 */
export function useSourceField(source: Source, field: TextField) {
  const saved = source[field] ?? '';
  const [edit, setEdit] = useState<FieldEdit>(() => ({
    sourceId: source.id,
    saved,
    draft: saved,
    error: null,
  }));
  const updateSourceMutation = useUpdateSource();

  const current =
    edit.sourceId === source.id && edit.saved === saved
      ? edit
      : { sourceId: source.id, saved, draft: saved, error: null };

  function setDraft(draft: string) {
    setEdit({ ...current, draft });
  }

  function commit() {
    if (current.draft.trim() === saved) {
      setEdit({ ...current, draft: saved, error: null });
      return;
    }

    const result = updateSourceSchema.shape[field].safeParse(current.draft);

    if (!result.success) {
      setEdit({
        ...current,
        error: result.error.issues[0]?.message ?? 'Invalid value',
      });
      return;
    }

    setEdit({ ...current, error: null });
    updateSourceMutation.mutate(
      { id: source.id, input: { [field]: current.draft } },
      {
        onError: () =>
          setEdit((latest) => ({
            ...latest,
            error: 'Could not save. Try again.',
          })),
      },
    );
  }

  return {
    draft: current.draft,
    setDraft,
    error: current.error,
    commit,
  };
}
