# Collections

## Purpose

Collections group sources. They can nest: a collection inside another one is called a **folder** in the UI. A source can be in many collections, or in none (then it lives only in the library).

## Behavior

### Creating and naming

- A new collection is called "New collection". A new folder opens right after it is made.
- To rename, edit the title on the collection page. Enter saves, and Escape or an empty name restores the old name. If the save fails, the old name comes back.

### What a collection shows

- A collection shows its own sources **and** every source in the folders below it, each source once.
- `saveCount` counts the same set. It is worked out from the sources on every read and never stored.
- A card shows up to 3 previews, newest first, picked from the same set as the page.
- Dropping files on a collection card adds them to that collection.

### Deleting

- Deleting asks for confirmation, then goes to the library.
- A collection can't be restored. Its folders are deleted with it.
- A source that was only in the deleted collections goes to the trash. If it's restored, it comes back to the library.
- A source that is also in another collection just loses the deleted one and stays visible.

## Decisions

- **2026-09 — Deleting a collection is a hard delete, but its sources go to the trash.** Losing a folder is cheap. Losing saved inspiration is not.
- **2026-10 — Collections nest through `parentId`.** One model covers both collections and folders.
- **2026-10 — A parent shows everything in its folders.** Otherwise, saving into a folder would make the source seem to disappear from the collection the user was browsing.
- **2026-10 — `saveCount` is worked out, not stored**, so it can never drift from the real sources.
- **2026-10 — Collection deletes run in one transaction** with the source updates, so collections and sources always change together.

## Known gaps

- Folders can't be moved to another parent yet. `UpdateCollectionInput` only allows `name`.
