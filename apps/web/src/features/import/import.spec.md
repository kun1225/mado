# Import

## Purpose

Bring a folder of images, videos and text files into the library, or rebuild a library from an unzipped export.

**Depends on:** `collections` (types), `export` (the `library.json` schema), `sources`, `storage`. **Used by:** `settings` (the Data tab). See `apps/web/ARCHITECTURE.md`.

## Behavior

- **Settings → Data → Import a folder** opens the browser's folder picker. Picking nothing does nothing.
- While it runs, the tab shows "Importing file 12 of 80…" and a bar. Closing the settings does not stop it. Export is off until it ends, and the other way round.
- It works offline.
- When it ends, a toast says what happened, for example "Imported 12 sources and 3 collections. 2 files were skipped." With nothing new: "Nothing new to import."
- One file that fails is counted ("1 file could not be saved.") and the rest go on. A full disk stops it: "Not enough space to import this folder."

### A folder from Export

The folder has `library.json` at its top (see `export.spec.md`).

- Every collection and source keeps its id, name, nesting, color, note, tags, link, site preview and dates.
- A source copied into several folders comes back as one source in all of them. Any copy of its file will do.
- **An id that is already here is skipped**, trash included. Importing your own export again changes nothing.
- An image or video whose file is gone is skipped. A website without its thumbnail is kept as a link card.
- A text source reads its body from its `text` file, so an edit made to that file before importing is kept. A text source whose text file is gone is skipped; one whose thumbnail is gone is kept without it. A text file that is empty or over 1 MB counts as "could not be saved".
- A link to a collection that is nowhere (not in the file, not in the library) is dropped. A collection whose parent is gone moves to the top.
- Files are not compressed again. They were compressed before the export.
- A `library.json` that is broken or from a newer version falls back to the plain-folder rule, and the toast says so. Versions 1 and 2 both import.

### A plain folder

- The folder you pick becomes a collection. Each subfolder becomes a folder inside it, at the same depth.
- Every image, video and `.txt`/`.md`/`.markdown` file becomes a source, saved the same way as a dropped file. A `.md` with no type still counts, by its extension.
- Other files (HTML, CSV, PDF, …), empty files, files over 512 MB and text files over 1 MB are skipped and counted. Hidden files (`.DS_Store`, anything inside a `.folder`) are skipped quietly.
- A folder with no images, videos or text files anywhere inside it does not become a collection.
- Folder names are cut to 100 characters (never inside an emoji).

## Decisions

- **2026-10 — A folder, not a `.zip`.** `<input webkitdirectory>` works in every desktop browser and hands over files that stay on disk until read. Reading a big zip would need a streaming unzip library first.
- **2026-10 — Skip ids that already exist.** Replacing them could undo edits made after the export. Skipping makes import safe to run twice.
- **2026-10 — The picked folder becomes a collection** in a plain folder, so its files don't land loose in the library. An export's top folder is not a collection, because `library.json` already says where everything goes.
- **2026-10 — One source at a time.** It keeps memory low for a library of many GB and gives a steady progress bar.
- **2026-10 — A new `storageKey` for every imported file,** and records are saved with `add`, not `put`. If another tab saved the same id meanwhile, the import fails for that source instead of overwriting it or its file.
- **2026-10 — The plan is a pure function (`buildImportPlan`).** Every rule is tested without IndexedDB or OPFS.
- **2026-10 — Its own domain,** like `export`. It touches both `collections` and `sources`. Inside either one, it would add to the coupling between them.

## Known gaps

- No drag and drop of a folder onto the library yet (see `sources.spec.md`).
- No `.zip` import. Users unzip first.
- Empty folders in a plain folder are lost, because the browser does not list them.
- Importing the same plain folder twice makes copies, since plain files have no ids.
- iPhone and iPad can't pick a folder.
- No cancel button.
- No component tests for the Data tab (the web app has no `@testing-library` yet).
