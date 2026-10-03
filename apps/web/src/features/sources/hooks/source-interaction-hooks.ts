import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { detectPastedContent, isEditablePasteTarget } from '../source-media';
import type { Source } from '../source-types';
import { updateSourceSchema } from '../source-types';

import { useUpdateSource } from './source-hooks';

export const SOURCE_SEARCH_KEY = 'source';

export type SourceDetailView = {
  index: number;
  source: Source | undefined;
  previous: Source | undefined;
  next: Source | undefined;
};

/** Finds the open source and its neighbours in the list the grid is showing. */
export function resolveSourceDetail(
  sources: Source[],
  activeId: string | null,
): SourceDetailView {
  const index =
    activeId === null ? -1 : sources.findIndex(({ id }) => id === activeId);

  if (index === -1) {
    return { index, source: undefined, previous: undefined, next: undefined };
  }

  return {
    index,
    source: sources[index],
    previous: sources[index - 1],
    next: sources[index + 1],
  };
}

export function useSourceDetail() {
  const search: Record<string, unknown> = useSearch({ strict: false });
  const navigate = useNavigate();
  const rawId = search[SOURCE_SEARCH_KEY];
  const activeId = typeof rawId === 'string' ? rawId : null;

  const setActiveId = (id: string | null, options?: { replace?: boolean }) =>
    navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        [SOURCE_SEARCH_KEY]: id ?? undefined,
      }),
      replace: options?.replace ?? false,
      resetScroll: false,
    } as never);

  return { activeId, setActiveId };
}

export type ToggleSelectOptions = {
  isRange: boolean;
};

export type SelectionState = {
  baseIds: ReadonlySet<string>;
  anchorId: string | null;
  rangeTargetId: string | null;
};

export const EMPTY_SELECTION_STATE: SelectionState = {
  baseIds: new Set(),
  anchorId: null,
  rangeTargetId: null,
};

export type SourceSelection = {
  selectedSources: Source[];
  isSelectionMode: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string, options: ToggleSelectOptions) => void;
  clear: () => void;
};

export function useSourceSelection(sources: Source[]): SourceSelection {
  const [state, setState] = useState<SelectionState>(EMPTY_SELECTION_STATE);

  const selectedIds = getSelectedIds(state, sources);
  const selectedSources = getSelectedSources(sources, selectedIds);
  const isSelectionMode = selectedSources.length > 0;

  useEffect(() => {
    if (!isSelectionMode) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;

      setState(EMPTY_SELECTION_STATE);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode]);

  function toggle(id: string, options: ToggleSelectOptions) {
    setState((current) => applyClick(current, sources, id, options));
  }

  function clear() {
    setState(EMPTY_SELECTION_STATE);
  }

  return {
    selectedSources,
    isSelectionMode,
    isSelected: (id) => selectedIds.has(id),
    toggle,
    clear,
  };
}

export function applyClick(
  state: SelectionState,
  sources: Source[],
  id: string,
  { isRange }: ToggleSelectOptions,
): SelectionState {
  if (isRange && state.anchorId !== null) {
    return { ...state, rangeTargetId: id };
  }

  const baseIds = toggleSelection(getSelectedIds(state, sources), id);

  return {
    baseIds,
    anchorId: baseIds.size === 0 ? null : id,
    rangeTargetId: null,
  };
}

export function getSelectedIds(
  state: SelectionState,
  sources: Source[],
): ReadonlySet<string> {
  if (state.rangeTargetId === null) return state.baseIds;

  return new Set([
    ...state.baseIds,
    ...getRangeIds(sources, state.anchorId, state.rangeTargetId),
  ]);
}

function getRangeIds(
  sources: Source[],
  anchorId: string | null,
  targetId: string,
): string[] {
  const targetIndex = sources.findIndex((source) => source.id === targetId);

  if (targetIndex === -1) return [];

  const anchorIndex = sources.findIndex((source) => source.id === anchorId);

  if (anchorIndex === -1) return [targetId];

  return sources
    .slice(
      Math.min(anchorIndex, targetIndex),
      Math.max(anchorIndex, targetIndex) + 1,
    )
    .map((source) => source.id);
}

export function toggleSelection(
  selectedIds: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  if (!selectedIds.has(id)) return new Set([...selectedIds, id]);

  return new Set([...selectedIds].filter((selectedId) => selectedId !== id));
}

export function getSelectedSources(
  sources: Source[],
  selectedIds: ReadonlySet<string>,
): Source[] {
  return sources.filter((source) => selectedIds.has(source.id));
}

type TextField = 'name' | 'url' | 'note';

type FieldEdit = {
  sourceId: string;
  saved: string;
  draft: string;
  error: string | null;
};

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

  return { draft: current.draft, setDraft, error: current.error, commit };
}

export function usePasteMedia(onPaste: (file: File) => void) {
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      if (isEditablePasteTarget(event.target)) return;

      const content = detectPastedContent(event.clipboardData);
      if (content.kind !== 'media') return;

      event.preventDefault();
      onPaste(content.file);
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onPaste]);
}
