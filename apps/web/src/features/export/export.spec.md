# Export

## Purpose

Download the whole library as one `.zip`, so users always have a copy of their saves outside the browser. Import reads the unzipped folder back (see `import.spec.md`).

**Depends on:** `collections`, `sources`, `storage`. **Used by:** `settings` (the Data tab), `import` (the `library.json` schema). See `apps/web/ARCHITECTURE.md`.

## Behavior

- **Settings → Data → Export** starts it. The tab shows how many sources and collections there are. With no sources, the button is off and says "Nothing to export yet."
- **Chrome and Edge:** a "Save as" window opens first, and the zip is written straight into the chosen file.
- **Safari and Firefox:** the zip is built in the account's OPFS folder (`exports/`, under a random name), then downloaded with the dated name.
- It first waits for background compression to finish, then reads the records once.
- While it runs, the tab shows "Packing file 46 of 121…" and a bar. Closing the settings or switching tabs does not stop it, and the bar is still there when you come back.
- It works offline.
- When it ends, a toast says "Exported 121 sources." If some files were gone, it adds "2 files were missing."
- Closing the "Save as" window does nothing: no toast.
- Errors show a toast: a full disk, a blocked save, or a general "Could not export your library."
- The trash is not exported.

### What is inside

```text
mado-export-2026-10-19.zip
└── mado-export-2026-10-19/
    ├── Moodboard/              a collection
    │   ├── hero.webp
    │   ├── hero (2).webp       same name, numbered
    │   ├── Dribbble.url        a website: a shortcut…
    │   ├── Dribbble.png        …and its thumbnail
    │   └── Typography/         a folder inside it
    ├── Unsorted/               sources in no collection
    └── library.json            every record, for import
```

- Every collection gets a folder, even an empty one.
- A source in two collections is copied into both folders.
- Names drop the characters Windows and macOS refuse (`/ \ : * ? " < > |`), lose trailing dots and spaces and leading dots, and are cut to 60 characters (never inside an emoji). Windows device names (`CON`, `nul.txt`, …) get a `-`. Repeats get `(2)`, `(3)`, checked without case and with Unicode normalized (NFC). `Unsorted` and `library.json` at the top are kept for the export, so a collection with that name gets `(2)`.
- The extension comes from the stored file's mime type, then from `fileName`.
- Each file's date is the source's `updatedAt`.

### `library.json`

- Built and checked by one zod schema, `exportManifestSchema`, with `format: 'mado-export'` and a `version`.
- Has every collection (with its folder `path`) and every source (name, note, tags, link, site preview, sizes, dates).
- Each source lists its `files` with a role, `media` or `shortcut`.
- Paths start inside the top folder, so renaming that folder after unzipping breaks nothing.
- `missingFiles` lists the files that were gone while exporting.
- No `storageKey` and no `deletedAt`. They only mean something inside this browser.

## Decisions

- **2026-10 — Stream the zip with `client-zip`.** A library can be many GB, so building the zip in memory would crash the tab. `client-zip` streams, supports Zip64 and does not compress. The media is already compressed, so trying again only costs CPU.
- **2026-10 — The save picker first, an OPFS file as the fallback.** The picker writes into the user's file with no second copy. Without it, an OPFS file stays on disk, where a blob this big could fill the memory.
- **2026-10 — Each OPFS zip gets a random name, and zips older than an hour are removed at the next export,** not after their download. Removing one right away can break a download that is still running, and a unique name keeps two exports from touching the same file. A zip that can't be removed (another tab is writing it) is left alone.
- **2026-10 — `networkMode: 'always'`.** Export never uses the network. React Query's default pauses mutations offline and resumes them later without a click, when the picker is no longer allowed.
- **2026-10 — Wait for the compression queue first.** Compression rewrites files in place. Reading one while it is rewritten fails the whole zip, and the record would still name the old type.
- **2026-10 — Progress lives outside React** (`useSyncExternalStore`), so the bar survives the Data tab unmounting.
- **2026-10 — Names are cut to 60 characters,** so nested folders stay under the 260-character path limit of Windows Explorer.
- **2026-10 — The picker opens before any database read.** Browsers only allow it right after a click.
- **2026-10 — The layout is a pure function (`buildExportLayout`).** Every naming rule is tested without IndexedDB or OPFS.
- **2026-10 — Records are read once at the start.** A file deleted or replaced while exporting is skipped and listed in `missingFiles`, so one missing file never fails the whole export.
- **2026-10 — A source in two collections is copied into both folders.** The zip matches what users see in the app. `library.json` lists both paths, so import can rebuild one source.
- **2026-10 — A website becomes a `.url` shortcut**, which opens in the browser on Windows and macOS. Line breaks in the link are removed, so a stored link cannot add lines to the file.
- **2026-10 — Its own domain.** Export reads both `collections` and `sources`. Inside either one, it would add to the coupling between them.

## Known gaps

- No cancel button. Closing the tab or signing out stops it with no message.
- A compression that starts during the export (a file added mid-export) can still make it fail with the general error.
- Chrome may leave an empty zip in the chosen folder when an export fails. Not checked yet.
- Very deep nesting can still pass 260 characters on Windows; only each name is capped.
- On Safari and Firefox, the zip takes disk space twice: once in OPFS, once in Downloads. The OPFS copy stays until an export at least an hour later.
- No component tests for the Data tab (the web app has no `@testing-library` yet).
- Import reads an unzipped folder only, not the `.zip` itself (see `import.spec.md`).
