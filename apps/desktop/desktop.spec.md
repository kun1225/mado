# Desktop app

## Purpose

An Electron app for macOS that shows the web app in a window and keeps the library in a folder the user picks, as plain files. The web app is the only UI. `apps/desktop` has the main process and the preload script, and no UI.

**Depends on:** `apps/web` (it loads it). **Used by:** nobody. The web app talks to it through `window.madoDesktop` (`features/desktop`). See `apps/web/ARCHITECTURE.md` and `docs/plans/desktop-library-folder-plan.html`.

## Behavior

- The window opens `/library`, not the landing page. In development it loads `http://localhost:3100/library`. The packaged app loads the deployed web app at `https://mado-web.the-kunyang.workers.dev/library`. `MADO_WEB_URL` overrides both.
- **First run:** the app creates and opens `Documents/mado`, using the system Documents path, and remembers it in `config.json`. A missing or broken config uses this default. A saved folder always takes priority. The user can change it in Settings: picking a parent makes a `Mado Library` folder inside it; picking `Mado Library` or the default `Documents/mado` opens it directly.
- **The folder is gone** (moved, renamed, drive unplugged): the app shows "We can't find your library" with Choose folder and Try again. It never makes a new empty library on its own.
- **Settings → Data → Storage** shows the Library folder with **Change folder** and **Show in Finder**. The browser's quota is not shown, and the usage is the size of the library's files. Changing the folder opens the library in the new folder, or makes one there. It does not move or copy files, and the old files stay where they are.
- **Links to other sites** open in the browser, never in a new app window, and a redirect to another site is blocked the same way. Every bridge call also checks that it comes from the top frame of our own page, so a page we don't own never gets the library.

### The folder

```text
Mado Library/
├── AGENTS.md           rules for an AI agent (written once, never overwritten)
├── collections.json    every collection
├── sources/<id>.json   one source: name, note, tags, collections, sizes…
└── media/<storageKey>  the files
```

- A source file is the same shape as the web app's `Source`. A text body and a website preview stay inside it.
- File names are the id or key, URL-encoded, so no id can leave the folder.
- Every write goes to a temp file and is then renamed, so a crash leaves the old file.
- A media file appears under its real name only when it is complete. It is written in 8 MB chunks, and read through `mado-media://media/<key>` so the browser can stream it.
- A record changes in memory only after its file is saved, and all changes run through one queue, so a failed save leaves nothing behind and a reload never overwrites a newer edit.
- The app reads the whole folder at start and keeps the records in memory. A file that can't be read is skipped and logged, and never stops the app.

### Editing outside the app

- A watcher reloads a record when its file changes outside the app, for example when Claude Code or Codex edits `tags`. The page refreshes the sources and collections lists.
- The app ignores its own writes by comparing the file's text with what it last wrote.
- A file that is not valid keeps the last good record in memory and is logged.
- If the app and an agent change the same record at once, the file on disk wins.

## Packaging

- `pnpm --filter desktop dist` builds `apps/desktop/dist/Mado.dmg` with electron-builder. It is one universal DMG for Intel and Apple Silicon.
- To ship it, attach `Mado.dmg` to a GitHub release. The landing page links to `releases/latest/download/Mado.dmg`, so keep that file name.
- **Updates.** Changes to the web app reach users on the next launch or reload, because the app loads the live site. Only changes in `apps/desktop` need a new DMG. On launch, the packaged app asks GitHub for the latest release. When its tag (`vX.Y.Z`) is newer than `version` in `package.json`, a dialog offers Download (opens the release page in the browser) and Later. A failed check is only logged. So bump `version` and tag the release with the same number.
- The package holds only `src` and `package.json`. The app uses only Electron and Node built-ins, so `node_modules` is left out.

## Decisions

- **2026-11 — Electron, not Tauri or SwiftUI.** See `docs/roadmap.md`.
- **2026-11 — One JSON file per source, not one `library.json` and not SQLite.** An agent can read and edit one small file, and a write touches one small file. SQLite is a binary file that is awkward for an agent, and it needs a native module.
- **2026-11 — No IndexedDB or OPFS in the desktop app.** The folder holds everything, so it can be backed up, moved, and edited by an agent. The renderer reaches it through `LibraryStore` (`features/storage`).
- **2026-11 — Media is read through a URL, not IPC.** A big video can stream and seek, and nothing is copied through IPC.
- **2026-11 — The app loads the deployed web app, not files inside it.** The web app renders on the server (TanStack Start), so it can't run from local files. Cost: the app needs the network to open.
- **2026-11 — Ad-hoc signed, not signed by Apple, for now.** No Apple Developer account yet. Ad-hoc signing keeps Apple Silicon from calling the app damaged; users still click Open Anyway once. Hardened runtime is off, because it only matters for notarization and breaks ad-hoc signed Electron apps.
- **2026-11 — Update prompt, not auto-update.** macOS only lets an app replace itself when both versions carry the same Developer ID signature; ad-hoc signatures differ each build. So the app points to the download until it is signed by Apple, then electron-updater can take over.
- **2026-11 — New web code must check a bridge method exists before calling it.** The web app updates at once, but users replace the app by hand, so a new page can run in an old app.
- **2026-11 — The packaged app is named Mado, but dev stays `desktop`.** `build.extraMetadata` sets the name only in the package. Renaming dev would move its settings folder (`Application Support/desktop`) and forget the library folder.
- **2026-11 — The preload lists its method names twice** (also in `main/ipc.js`), because a sandboxed preload can't import a local file.

## Known gaps

- Not notarized: the first open needs System Settings → Privacy & Security → Open Anyway.
- No auto-update. The app tells users about a new version, and they replace it by hand.
- The website sources and feedback form call the API, which is not deployed, so they fail in the packaged app and on the live web app.

- One library per folder, so the signed-in account is ignored. The web app keeps one library per account.
- No lock file, so two copies of the app on one folder can overwrite each other.
- A folder in iCloud Drive or Dropbox can evict files or make conflict copies.
- No readable names in Finder: media files are named by `storageKey`.
- Changing the folder does not move the files.
- `readMediaFile` loads a whole file as a Blob. A direct `mado-media://` URL for the player is the next step for very large videos.
- Changing the folder while a multi-step action runs can split that action across two libraries. Opens are queued, but the actions are not bound to one library.
- Deleting a collection is several writes, not one, and a collection file with a cycle is not rejected.
- A bad edit by an agent is only logged. The app shows nothing.
- An edit made in the first moments after a library opens can be missed until the next start, because the native watcher takes a moment to begin.
- The canvas file, the CLI runner and the production build (`app://`, SPA mode) are not built yet.
- Export on desktop uses the browser save picker. It is not checked in Electron yet.

### Website previews

- Website details use an isolated Electron `WebContentsView`, including sites that block iframe embedding. The view has no Node.js, preload, library bridge, or device permissions, and uses a separate in-memory browser session. Only HTTP(S) URLs are accepted; popup windows are blocked.
- The stored thumbnail remains visible during loading and opening/closing motion. The Open website link shows only when loading fails, so it never flashes over the thumbnail during loading or motion.
- The view follows the viewer bounds and browser zoom. It hides while the viewer or its media animates (opening, closing) and when another dialog covers the viewer. Hover and focus transitions on buttons in the viewer do not hide it, or the page would flash. Closing, changing sources, file dragging, renderer navigation, or destroying the window closes the view.
- Native views have rectangular bounds; CSS rounded corners do not clip them. Keyboard shortcuts while focus is inside the website belong to that website; the dialog toolbar remains available.
