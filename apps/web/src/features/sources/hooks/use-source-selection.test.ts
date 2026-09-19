import { describe, expect, it } from 'vitest';

import type { Source } from '../source-types';

import type {
  SelectionState,
  ToggleSelectOptions,
} from './use-source-selection';
import {
  applyClick,
  EMPTY_SELECTION_STATE,
  getSelectedIds,
  getSelectedSources,
  toggleSelection,
} from './use-source-selection';

function buildSource(id: string): Source {
  return {
    id,
    collectionId: null,
    kind: 'image',
    fileName: `${id}.png`,
    mimeType: 'image/png',
    sizeBytes: 1024,
    width: 800,
    height: 600,
    durationSeconds: null,
    storageKey: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

const SOURCES = ['1', '2', '3', '4', '5', '6'].map(buildSource);

const CLICK: ToggleSelectOptions = { isRange: false };
const SHIFT_CLICK: ToggleSelectOptions = { isRange: true };

/** Replays a run of clicks and reports what ends up selected, in grid order. */
function click(
  ...steps: [id: string, options: ToggleSelectOptions][]
): string[] {
  const state = steps.reduce<SelectionState>(
    (current, [id, options]) => applyClick(current, SOURCES, id, options),
    EMPTY_SELECTION_STATE,
  );

  return getSelectedSources(SOURCES, getSelectedIds(state, SOURCES)).map(
    ({ id }) => id,
  );
}

describe('clicking', () => {
  it('selects one card', () => {
    expect(click(['2', CLICK])).toEqual(['2']);
  });

  it('deselects a card that was already selected', () => {
    expect(click(['2', CLICK], ['2', CLICK])).toEqual([]);
  });

  it('adds each clicked card to the selection', () => {
    expect(click(['2', CLICK], ['4', CLICK])).toEqual(['2', '4']);
  });
});

describe('shift-clicking', () => {
  it('selects the range from the anchor to the target', () => {
    expect(click(['2', CLICK], ['4', SHIFT_CLICK])).toEqual(['2', '3', '4']);
  });

  it('replaces the last range instead of adding to it', () => {
    expect(click(['2', CLICK], ['4', SHIFT_CLICK], ['1', SHIFT_CLICK])).toEqual(
      ['1', '2'],
    );
  });

  it('keeps cards that a plain click selected', () => {
    expect(click(['2', CLICK], ['4', CLICK], ['6', SHIFT_CLICK])).toEqual([
      '2',
      '4',
      '5',
      '6',
    ]);
  });

  it('starts an anchor when there is none yet', () => {
    expect(click(['3', SHIFT_CLICK])).toEqual(['3']);
  });

  it('commits the range once a plain click follows it', () => {
    expect(
      click(['2', CLICK], ['3', SHIFT_CLICK], ['5', CLICK], ['6', SHIFT_CLICK]),
    ).toEqual(['2', '3', '5', '6']);
  });
});

describe('the anchor', () => {
  it('moves to the last plain click', () => {
    expect(click(['1', CLICK], ['3', CLICK], ['5', SHIFT_CLICK])).toEqual([
      '1',
      '3',
      '4',
      '5',
    ]);
  });

  it('resets once nothing is left selected', () => {
    // Clicking 2 twice empties the selection, so Shift on 4 has no anchor and
    // selects 4 alone.
    expect(click(['2', CLICK], ['2', CLICK], ['4', SHIFT_CLICK])).toEqual([
      '4',
    ]);
  });

  it('falls back to the target when the anchored card is gone', () => {
    const state: SelectionState = {
      baseIds: new Set(),
      anchorId: 'gone',
      rangeTargetId: null,
    };

    expect([
      ...getSelectedIds(applyClick(state, SOURCES, '4', SHIFT_CLICK), SOURCES),
    ]).toEqual(['4']);
  });
});

describe('toggleSelection', () => {
  it('leaves the given set untouched', () => {
    const selectedIds = new Set(['1']);

    toggleSelection(selectedIds, '2');

    expect([...selectedIds]).toEqual(['1']);
  });
});

describe('getSelectedSources', () => {
  it('returns the selected sources in grid order', () => {
    expect(
      getSelectedSources(SOURCES, new Set(['4', '1'])).map(({ id }) => id),
    ).toEqual(['1', '4']);
  });

  it('ignores ids whose source is gone', () => {
    expect(
      getSelectedSources(SOURCES, new Set(['1', 'gone'])).map(({ id }) => id),
    ).toEqual(['1']);
  });
});
