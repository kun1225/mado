import { useEffect, useState } from 'react';

import type { Source } from '../source-types';

export type ToggleSelectOptions = {
  isRange: boolean;
};

/**
 * A plain click commits to `baseIds` and moves the anchor. A Shift-click only
 * moves `rangeTargetId`, so the range is recomputed from the same anchor every
 * time and the previous one is dropped rather than added to.
 */
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

/**
 * Selection is held as ids rather than sources, so a refetch that hands back
 * new objects never invalidates what is selected.
 */
export function applyClick(
  state: SelectionState,
  sources: Source[],
  id: string,
  { isRange }: ToggleSelectOptions,
): SelectionState {
  // Shift with no anchor has nothing to reach back to, so it starts one.
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

  // The anchored card has since been deleted, so the range is the target alone.
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

/**
 * Drops ids whose source is gone, so a deleted card cannot keep inflating the
 * count shown in the action bar.
 */
export function getSelectedSources(
  sources: Source[],
  selectedIds: ReadonlySet<string>,
): Source[] {
  return sources.filter((source) => selectedIds.has(source.id));
}
