# Storage

## Purpose

The local database under every feature. On the web, records go in IndexedDB and media files go in OPFS (see `sources`). In the desktop app, both are plain files in the library folder (see `apps/desktop/desktop.spec.md`).

**Depends on:** `desktop` (only `getDesktopBridge()`, to pick a store). **Used by:** every domain. See `apps/web/ARCHITECTURE.md`.

## Behavior

- Guests use the `mado` database and the OPFS root.
- A signed-in user uses `mado:account:<id>` and the OPFS folder `account-<id>`. Accounts on the same device never see each other's data.
- `getAccountDirectory()` returns that OPFS folder. Inside it, `media/` holds source files (see `sources`) and `exports/` holds export zips on browsers without a save picker, removed by a later export once they are an hour old (see `export`).
- `readStorageUsage()` returns the bytes this site uses and the most it may use (`quota`, null if the browser gives none) from `navigator.storage.estimate()`, or null if the browser can't say. The numbers cover the whole site, not one account, and the browser rounds it. `formatBytes()` turns bytes into B, KB, MB, GB or TB (see `settings`).
- Records are read and written only through `getLibraryStore()`, which returns a `LibraryStore` (`library-store.type.ts`): list, get, put and delete collections and sources, list the sources of one collection, and `addSource`, which fails if the id exists. On the web it is `indexedDbLibraryStore`. In the desktop app it is the bridge's `library`, so there is no IndexedDB there.
- `withLibraryLock(task)` runs a read-then-write as one step. It uses the Web Locks API, so a second tab waits too, and falls back to a queue where that API is missing. Never call a locked function from inside another one.
- Stores: `collections` and `sources`. `sources` has a multi-entry index on `collectionIds`.
- If the browser has no IndexedDB or OPFS, the app shows a "storage unsupported" notice instead of breaking.

## Decisions

- **2026-10 — One database per account**, chosen by `getStorageAccount()` when the database opens. Separating whole databases is simpler and safer than filtering every query by user.
- **v3 migration — `collectionId` became `collectionIds`**, and sources gained `name`, `url`, `note` and `tags`. The migration runs inside the upgrade transaction, so it all works or nothing changes.
- **A `VersionError` opens the database at its current version** instead of failing. This happens when another tab or a newer build already upgraded it.
- **2026-10 — Text sources added an optional `text` field to source records, with no migration.** No store or index changed, and old records simply have no `text`. The text body is kept in IndexedDB, not OPFS (see `sources.spec.md`).
- **2026-11 — Records go behind `LibraryStore`, and read-then-write steps take `withLibraryLock`.** A desktop store can't hold an IndexedDB transaction open across IPC, so the transaction became a lock. The lock keeps what the transaction gave us: two edits at once don't lose one. The existing test "applies add and remove to the stored lists, not to a stale copy" caught this.
- **Deleting a collection is no longer one transaction.** Its sources go to the trash branch by branch, then the collections are removed. A failure in the middle can leave sources trashed and the collection still there.

## Rules for changes

- Changing a store or index means raising `DATABASE_VERSION` and adding a migration step guarded by `event.oldVersion`.
- Never read data across accounts. Records go through `getLibraryStore()`, and the web's IndexedDB code goes through `openDatabase()` and `getAccountDirectory()`.
- A new store operation must be added to `LibraryStore`, the IndexedDB store, and the main process (`apps/desktop/src/main/library-records.js`, plus the method lists in `ipc.js` and `preload.cjs`).
