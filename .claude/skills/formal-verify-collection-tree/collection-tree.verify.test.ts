import { describe, expect, it } from 'vitest';

import type { Collection } from '../../../apps/web/src/features/collections/collection-types';
import type { ExportManifest } from '../../../apps/web/src/features/export/export.type';
import { buildImportPlan } from '../../../apps/web/src/features/import/import-plan';
import { collectBranchIds } from '../../../apps/web/src/features/sources/source-actions';

// Why these bounds: a loop needs 2 collections, and 3 and 4 add longer loops and
// loops with a tail. The count guard below fails if the enumeration silently shrinks.
const MAX_COLLECTIONS = 4;
const EXPECTED_IMPORT_CASES = 4 ** 1 + 5 ** 2 + 6 ** 3 + 7 ** 4;
const EXPECTED_TREE_CASES = 1 + 3 + 16 + 125;
const EXISTING_ID = 'e0';
const UNKNOWN_ID = 'ghost';
// A real walk over 4 collections needs fewer than 16 steps.
const STEP_BUDGET = 10_000;

type ParentChoice = string | null;

describe('import: the collections it saves', () => {
  it('covers every parent choice up to the bound', () => {
    expect([...importCases()]).toHaveLength(EXPECTED_IMPORT_CASES);
  });

  it('never points a parent at a collection that does not exist', () => {
    const failures = [...importCases()].flatMap(({ parents, plan }) => {
      const known = new Set([...plan.collections.map(toId), EXISTING_ID]);
      const dangling = plan.collections.filter(
        ({ parentId }) => parentId !== null && !known.has(parentId),
      );
      return dangling.length > 0 ? [describeParents(parents)] : [];
    });

    expect(failures, 'import saved a parent that is not a collection').toEqual(
      [],
    );
  });

  it('never saves a source into a collection that does not exist', () => {
    const failures = [...importCases()].flatMap(({ parents, plan }) => {
      const known = new Set([...plan.collections.map(toId), EXISTING_ID]);
      const lost = plan.items.some(
        (item) =>
          item.kind === 'record' &&
          item.source.collectionIds.some((id) => !known.has(id)),
      );
      return lost ? [describeParents(parents)] : [];
    });

    expect(failures, 'import saved a source into a missing collection').toEqual(
      [],
    );
  });

  it('never saves a parent loop', () => {
    const failures = [...importCases()].flatMap(({ parents, plan }) => {
      const loop = findParentLoop(plan.collections);
      if (!loop) return [];
      const stops = traversalStops(plan.collections, loop[0]);
      return [
        `${describeParents(parents)} -> loop ${loop.join(' -> ')}; ` +
          `collectBranchIds(${loop[0]}) ${stops ? 'stops' : 'never stops'}`,
      ];
    });

    expect(
      failures.slice(0, 3),
      `${failures.length} manifests save a loop. Shortest first`,
    ).toEqual([]);
  });
});

describe('collectBranchIds on every tree', () => {
  it('covers every tree up to the bound', () => {
    expect([...treeCases()]).toHaveLength(EXPECTED_TREE_CASES);
  });

  it('returns the root first, then each folder below it once', () => {
    const failures = [...treeCases()].flatMap((parents) => {
      const collections = toCollections(parents);
      return collections.flatMap(({ id }) => {
        const actual = collectBranchIds(collections, id);
        const expected = findDescendants(collections, id);
        const isRight =
          actual[0] === id &&
          new Set(actual).size === actual.length &&
          sameMembers(actual, expected);
        return isRight
          ? []
          : [`${describeParents(parents)} root ${id}: got ${actual.join(',')}`];
      });
    });

    expect(failures.slice(0, 3)).toEqual([]);
  });
});

// *** importCases ***
/** Every way up to 4 manifest collections can pick a parent, through the real `buildImportPlan`. */
function* importCases() {
  for (let count = 1; count <= MAX_COLLECTIONS; count += 1) {
    const ids = Array.from({ length: count }, (_, index) => `c${index}`);
    const choices: ParentChoice[] = [null, ...ids, EXISTING_ID, UNKNOWN_ID];

    for (const parents of product(choices, count)) {
      yield { parents, plan: planImport(parents) };
    }
  }
}

// *** treeCases ***
/** Only parent choices that make a tree, so `collectBranchIds` is never called on a loop. */
function* treeCases() {
  for (let count = 1; count <= MAX_COLLECTIONS; count += 1) {
    const ids = Array.from({ length: count }, (_, index) => `c${index}`);

    for (const parents of product([null, ...ids], count)) {
      if (!findParentLoop(toCollections(parents))) yield parents;
    }
  }
}

// *** planImport ***
function planImport(parents: ParentChoice[]) {
  const ids = parents.map((_, index) => `c${index}`);
  const manifest: ExportManifest = {
    format: 'mado-export',
    version: 1,
    exportedAt: '2026-10-19T00:00:00.000Z',
    collections: parents.map((parentId, index) => ({
      id: ids[index],
      name: ids[index],
      parentId,
      color: null,
      path: ids[index],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })),
    sources: [
      {
        id: 's0',
        name: 'site',
        kind: 'website',
        url: 'https://example.com',
        note: null,
        tags: [],
        collectionIds: [...ids, EXISTING_ID, UNKNOWN_ID],
        fileName: '',
        mimeType: '',
        sizeBytes: 0,
        width: null,
        height: null,
        durationSeconds: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        files: [],
      },
    ],
    missingFiles: [],
  };

  return buildImportPlan({
    files: [],
    manifest,
    existing: {
      collectionIds: new Set([EXISTING_ID]),
      sourceIds: new Set(),
    },
    newId: () => 'new-id',
    now: new Date('2026-10-20T08:00:00.000Z'),
  });
}

// *** findParentLoop ***
/** Walks the parent chain of each collection. Returns the first loop as ids, or null. */
function findParentLoop(collections: Collection[]): string[] | null {
  const parentById = new Map(collections.map((c) => [c.id, c.parentId]));

  for (const { id } of collections) {
    const seen = [id];
    let current = parentById.get(id) ?? null;

    while (current !== null && parentById.has(current)) {
      const index = seen.indexOf(current);
      if (index !== -1) return [...seen.slice(index), current];
      seen.push(current);
      current = parentById.get(current) ?? null;
    }
  }

  return null;
}

// *** traversalStops ***
/** Counts the steps of the real `collectBranchIds`, so a loop fails the check and does not freeze it. */
function traversalStops(collections: Collection[], rootId: string): boolean {
  let steps = 0;
  const watched = [...collections];
  const original = watched[Symbol.iterator].bind(watched);

  Object.defineProperty(watched, Symbol.iterator, {
    value: function* () {
      for (const item of original()) {
        steps += 1;
        if (steps > STEP_BUDGET) throw new Error('over budget');
        yield item;
      }
    },
  });

  try {
    collectBranchIds(watched, rootId);
    return true;
  } catch {
    return false;
  }
}

// *** findDescendants ***
/** The oracle: a plain recursive walk with a visited set, so it cannot loop. */
function findDescendants(collections: Collection[], rootId: string): string[] {
  const found = [rootId];

  for (const { id, parentId } of collections) {
    if (id !== rootId && isUnder(collections, id, rootId, parentId)) {
      found.push(id);
    }
  }

  return found;
}

// *** isUnder ***
function isUnder(
  collections: Collection[],
  id: string,
  rootId: string,
  parentId: string | null,
): boolean {
  const parentById = new Map(collections.map((c) => [c.id, c.parentId]));
  const seen = new Set([id]);
  let current = parentId;

  while (current !== null && !seen.has(current)) {
    if (current === rootId) return true;
    seen.add(current);
    current = parentById.get(current) ?? null;
  }

  return false;
}

// *** toCollections ***
function toCollections(parents: ParentChoice[]): Collection[] {
  return parents.map((parentId, index) => ({
    id: `c${index}`,
    name: `c${index}`,
    parentId,
    color: null,
    saveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));
}

// *** product ***
function* product<T>(choices: T[], length: number): Generator<T[]> {
  if (length === 0) {
    yield [];
    return;
  }

  for (const rest of product(choices, length - 1)) {
    for (const choice of choices) yield [...rest, choice];
  }
}

// *** describeParents ***
function describeParents(parents: ParentChoice[]): string {
  return parents.map((parent, index) => `c${index}.parent=${parent}`).join(' ');
}

// *** sameMembers ***
function sameMembers(first: string[], second: string[]): boolean {
  return (
    first.length === second.length && first.every((id) => second.includes(id))
  );
}

// *** toId ***
function toId({ id }: { id: string }): string {
  return id;
}
