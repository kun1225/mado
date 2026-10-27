# Storage

## Purpose

The local database under every feature. Records go in IndexedDB, and media files go in OPFS (see `sources`).

**Depends on:** nothing. **Used by:** every domain. See `apps/web/ARCHITECTURE.md`.

## Behavior

- Guests use the `mado` database and the OPFS root.
- A signed-in user uses `mado:account:<id>` and the OPFS folder `account-<id>`. Accounts on the same device never see each other's data.
- `getAccountDirectory()` returns that OPFS folder. Inside it, `media/` holds source files (see `sources`) and `exports/` holds export zips on browsers without a save picker, removed by a later export once they are an hour old (see `export`).
- `readStorageUsage()` returns the bytes this site uses and the most it may use (`quota`, null if the browser gives none) from `navigator.storage.estimate()`, or null if the browser can't say. The numbers cover the whole site, not one account, and the browser rounds it. `formatBytes()` turns bytes into B, KB, MB, GB or TB (see `settings`).
- Stores: `collections` and `sources`. `sources` has a multi-entry index on `collectionIds`.
- If the browser has no IndexedDB or OPFS, the app shows a "storage unsupported" notice instead of breaking.

## Decisions

- **2026-10 — One database per account**, chosen by `getStorageAccount()` when the database opens. Separating whole databases is simpler and safer than filtering every query by user.
- **v3 migration — `collectionId` became `collectionIds`**, and sources gained `name`, `url`, `note` and `tags`. The migration runs inside the upgrade transaction, so it all works or nothing changes.
- **A `VersionError` opens the database at its current version** instead of failing. This happens when another tab or a newer build already upgraded it.
- **2026-10 — Text sources added an optional `text` field to source records, with no migration.** No store or index changed, and old records simply have no `text`. The text body is kept in IndexedDB, not OPFS (see `sources.spec.md`).
- **Writes that must agree share one transaction**, for example deleting a collection and trashing its sources.

## Rules for changes

- Changing a store or index means raising `DATABASE_VERSION` and adding a migration step guarded by `event.oldVersion`.
- Never read data across accounts. Always go through `openDatabase()` and `getAccountDirectory()`.
