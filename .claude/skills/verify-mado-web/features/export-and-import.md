# Export and import

A user downloads the whole library as one zip, and brings a folder back in. Export writes `library.json` plus the files in one folder per collection. Import reads an unzipped export or any plain folder: a plain folder becomes a collection named after it. Specs: `apps/web/src/features/export/export.spec.md`, `apps/web/src/features/import/import.spec.md`.

## Sub-features

- `export-zip` Settings → Data → `Export .zip` downloads `mado-export-<date>.zip`.
- `export-layout` a folder per collection, the source files, and `library.json`.
- `export-empty` with no sources the button is off and says "Nothing to export yet."
- `import-plain` a plain folder becomes a collection of the same name with its files as sources.
- `import-export` an unzipped export keeps ids, and skips ids already in the library.

## How to get to it (user POV)

- Button `Settings`, sidebar `Data`, then `Export .zip` or `Import folder`.
- `?settings=data` opens the Data tab directly.
- Chrome and Edge ask for a save location first. Safari and Firefox download straight away.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, plus a collection `Moodboard` with `verify-red.png` and `verify-blue.png` in it, and the page on `/library?settings=data`.

- **Empty state.** Before any source exists, `Export .zip` is disabled. Snapshot the Data tab.
- **Force the OPFS path.** `$S/pw.sh eval "window.showSaveFilePicker = undefined"`. Without it, headless Chromium opens a native picker that blocks the run. Do it again after each reload, because it is a setting on the page, and run it before the click, after `$S/wait-ready.sh`.
- **Export.** `$S/pw.sh click "getByRole('button', { name: 'Export .zip' })"`. The command output has `Downloaded file mado-export-<date>.zip to ".playwright-cli/…"`, and a toast `Exported 2 sources.` shows.
- **Read the zip.** `unzip -l "$STATE_DIR/pw/.playwright-cli/mado-export-<date>.zip"` lists `mado-export-<date>/Moodboard/`, `…/Moodboard/verify-red.png`, `…/Moodboard/verify-blue.webp` (or `.png` when it was not compressed) and `…/library.json`. `unzip -p … library.json` has `"format": "mado-export"`, `"version": 2`, a collection with `path` `Moodboard`, both sources with their `files`, and an empty `missingFiles`.
- **OPFS copy.** `dump-state.sh` lists `exports/<uuid>.zip` in `files`. The zip is made inside OPFS and then downloaded.
- **Import a plain folder.** Make `$STATE_DIR/import-src/Verify Folder/` with the three fixtures. `$S/pw.sh run-code "async page => { await page.setInputFiles('input[webkitdirectory]', '$STATE_DIR/import-src/Verify Folder'); }"`. Wait 3 seconds. `dump-state.sh` has a new collection named `Verify Folder` with three sources (`verify-red`, `verify-blue`, `verify-note`) in it.
- **Proof.** The Data tab snapshot and screenshot, the `unzip -l` listing and `library.json` saved into `evidence/`, and the `dump-state.sh` JSON before and after the import, named `export-import-<step>`.

## Gotchas

- Playwright keeps the downloaded zip in `$STATE_DIR/pw/.playwright-cli/`, which is inside the run folder and survives cleanup. The name has today's date.
- Compression changes a PNG to WebP, so the exported file name may end in `.webp`. Export waits for compression first.
- The path with the real Chrome "Save as" picker (`showSaveFilePicker`) was not driven. Only the OPFS fallback was.
- An import is not undone by deleting the folder you picked. Start from a new session to reset.
- Importing an unzipped export into the library it came from skips every id that already exists. Use a new session to see a full import.
- The toast `Imported N sources and M collections.` fades before a slow snapshot. Read the state instead.
- Import reads an unzipped folder only, not the `.zip` file.
