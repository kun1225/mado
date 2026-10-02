import { useNavigate, useSearch } from '@tanstack/react-router';

import type { Source } from '../source-types';

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
