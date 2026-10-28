---
name: formal-verify-collection-tree
description: Checks, for every case up to 4 collections, that importing a library.json never saves a collection tree that has a loop, and that collectBranchIds returns exactly the folders below a root. Use when you change import-plan.ts, collectBranchIds, collection nesting (parentId), or how a collection is created, moved or imported.
---

# Verify the collection tree

## The promise and the harm

- **Promise:** the collections in the library always form a tree. No collection is its own ancestor.
- **Harm if it breaks:** `collectBranchIds` never returns on a loop. `pickPreviewSources` calls it for every collection card, so the library page freezes on every load. The only way out is to clear the site data, and that loses the library.

## Run it

From the repo root:

```bash
pnpm --filter web exec vitest run --dir ../../.claude/skills/formal-verify-collection-tree
```

It takes about 1 second. It needs nothing new: it uses the web app's own `vitest` and the real `buildImportPlan` and `collectBranchIds`, with no copy of them. The Node version warning (wants 24) is harmless.

## What it checks

It builds every `library.json` with 1 to 4 collections where each collection's `parentId` is one of: no parent, any collection in the file, a collection already in the library (`e0`), or an id that does not exist (`ghost`). That is 4 + 25 + 216 + 2,401 = 2,646 manifests. Each one goes through the real `buildImportPlan`.

| Test                                       | Plain meaning                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| covers every parent choice / every tree    | The enumeration did not shrink. If a count changes, someone changed the bound or the generator.                      |
| never points a parent at a missing one     | After import, every `parentId` is null, a saved collection, or an existing one.                                      |
| never saves a source into a missing one    | After import, every source's `collectionIds` names a real collection.                                                |
| **never saves a parent loop**              | After import, following `parentId` upward always ends. This is the promise.                                          |
| returns the root first, then each folder … | On all 145 trees of up to 4 collections, `collectBranchIds` returns the root, then every folder below it, each once. |

A loop is never passed to `collectBranchIds` without a guard: the check counts its steps (budget 10,000, a real walk needs under 16) so a loop fails the test and does not freeze it.

## Current result (at the sync commit)

**Expected: 5 pass, 1 fails.** The failing test is "never saves a parent loop". That is a real bug, not a modeling error:

```text
c0.parent=c1 c1.parent=c0 -> loop c0 -> c1 -> c0; collectBranchIds(c0) never stops
```

In words: a `library.json` where folder A says its parent is B and folder B says its parent is A. `exportManifestSchema` only checks that `parentId` is a string or null. `toCollectionRecord` in `import-plan.ts` only drops a parent that is the collection itself, or unknown. So both are saved with the loop. 374 of the 2,646 manifests in the bound do this. Export never writes a loop, so it takes a hand-edited or shared `library.json`.

The fix is not done here (the check never changes product code). Two places can fix it, and doing both is safest:

- `toCollectionRecord` / `toManifestPlan` drop a parent that would close a loop.
- `collectBranchIds` skips ids it already has.

When the fix lands, all 6 must pass. Then change "Expected" above.

## Real bug or modeling error?

- A failure in **never saves a parent loop / missing parent / missing collection**: read the printed manifest. If the product code really saves that shape, it is a real bug. Report it with the printed line. Do not remove the case or lower the bound.
- A failure in **returns the root first…**: `findDescendants` in the test is a plain walk with a visited set. If the two disagree, check the oracle first (read it, it is short), then `collectBranchIds`.
- A failure in a **covers every …** test: the generator or a constant changed. Fix the count only if you changed the bound on purpose.
- A compile or import error: a name or path in the product code moved. Update the imports and `planImport`; the manifest shape comes from `exportManifestSchema`.

## Scope

Verified: every case in the bound above, through the real functions. A pass says nothing about 5 or more collections, but a loop needs at most 2 (the failing case is 2), so a bigger bound adds shapes and no new kinds of loop.

Not covered:

- Collections made with `createCollection` (it checks the parent exists, and a new collection can't be its own ancestor), and `updateCollection` (it can't change `parentId` today: see `collections.spec.md`, known gaps). If folders become movable, add a "move" case here: every move of one collection onto another.
- `deleteCollection`: it uses `collectBranchIds`, so it is covered only for the walk, not for the trash and detach rules.
- IndexedDB, OPFS and timing. The media-file lifecycle (replace, compression and hard delete running together) is a separate check; see "A close second target".
- An existing library that already holds a loop (saved before a fix). Nothing repairs it.

## Coverage record

| Covered code                                                                                    | File                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `buildImportPlan`, `toManifestPlan`, `toCollectionRecord` (parent and `collectionIds` rules)    | `apps/web/src/features/import/import-plan.ts`     |
| `collectBranchIds`                                                                              | `apps/web/src/features/sources/source-actions.ts` |
| `exportManifestSchema` collections shape (read only: its fields feed `planImport` in the check) | `apps/web/src/features/export/export-manifest.ts` |

**Sync commit: `6ddf093`.** The check describes those functions as they are at this commit.

When one of the files above changes after the sync commit:

1. Run `git diff 6ddf093 -- <file>` and read what changed in the covered functions.
2. Run the check. If the change is intended (a new rule for parents, a new way to nest), update `planImport`, the constants and the table above so the check still describes the code.
3. Only after the check describes the code at the new commit, move the sync commit to it.

## Why it is built this way

- The property is about the real functions on every input in a bound, and the web app is TypeScript, which has no verifier that runs on the code. So the check lists every input in the bound and runs the real code on each. A TLA+ model would be a hand copy of `toCollectionRecord`, which can drift from it.
- No new package: a generator library would add a dev dependency for 2,646 cases that a loop can list.

## A close second target

The media-file lifecycle: `replaceSourceFile`, `runCompression` and `hardDeleteSource` all change the record and the file in OPFS, with an `await` between each step. The promise: a record never points to a file that is gone ("a card that never loads"). It is an ordering question, so a TLA+ model with TLC (Java 17 is installed) fits it. By reading, the current code keeps the promise: the new file is written before the record, and the record is changed before the old file is deleted. The model would lock that in.
