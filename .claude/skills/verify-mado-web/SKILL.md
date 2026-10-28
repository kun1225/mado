---
name: verify-mado-web
description: Launch Mado's web app (apps/web, TanStack Start + Vite) and drive it in a real browser with playwright-cli, to prove a change works. Use when asked to run, screenshot or verify the web app, or to prove a feature (adding sources, collections, search, settings and theme, export and import) works end to end, not only in unit tests.
---

# Verify the Mado web app

Mado's web app is local-first. Everything a guest saves lives in the browser: records in IndexedDB (database `mado`), files in OPFS. There is no server data to seed and no login: `apps/web/.env` sets `VITE_DEV_AUTH_BYPASS=true`, so every run is a guest. The API (`apps/api`, port 4000) is only needed to add a **website** source (`/api/v1/sites/preview`). This skill does not start it, so the website paths are out of reach unless you start the API yourself.

Drive it with **`playwright-cli`**, not Claude in Chrome. A new playwright-cli session has an empty in-memory profile, so IndexedDB and OPFS start empty, and a run cannot touch the person's real Chrome library. It also runs from Bash, so launch, drive and cleanup fit in one script.

All commands below run from the repo root (or the worktree root; the scripts find their own checkout).

## Launch

```bash
S=.claude/skills/verify-mado-web/scripts
$S/launch.sh        # starts Vite on port 3199, waits until /library answers 200
$S/pw.sh open http://localhost:3199/library
$S/wait-ready.sh   # prints "hydrated" when React has attached its handlers
```

- Port **3199**, not 3100. 3100 is the port of `pnpm dev`, which a person may be using. Set `MADO_VERIFY_PORT` for another port. `launch.sh` refuses to start when something else owns the port, and never touches it.
- The server runs `node node_modules/vite/bin/vite.js dev --port <port> --strictPort` in `apps/web`, with its pid in `$STATE_DIR/dev-server.pid` and its log in `$STATE_DIR/dev-server.log`. `STATE_DIR` is `$MADO_VERIFY_DIR` or `${TMPDIR:-/tmp}/mado-verify`.
- The first request is slow, because Vite compiles on demand.
- Ready means usable, not only that a page is served. The server renders the whole page, so buttons look ready before React has attached any handler. `wait-ready.sh` waits for that, and you run it after every `open`, `goto` and `reload`. A file set on the input before that moment is lost, and setting the same files again is then ignored. Reload and set them once more.
- The checkout may have `apps/web/src/routeTree.gen.ts` modified. Vite regenerates it. Do not stage or revert it as part of a verification.
- Always open the browser with `pw.sh open`, never `playwright-cli open` directly. `playwright-cli` can only read and write files under the folder it was first opened in, and `pw.sh` makes that `$STATE_DIR/pw` every time.

## Doctor

```bash
$S/doctor.sh
```

Read-only. It checks that something listens on the port, that the listener is the pid this skill recorded, that its working directory is this checkout's `apps/web`, that `/library` answers 200 with the Mado title, and that the dev auth bypass is on. Exit 0 means the instance is worth driving. Run it first whenever anything looks off. If it says the listener is not ours, stop: pick another port or ask the person. Never drive an instance this run did not start.

## Drive

`$S/pw.sh <playwright-cli args>` is `playwright-cli -s=mado-verify <args>`, run in `$STATE_DIR/pw`. Pick targets by role and accessible name, which are stable. Snapshot refs (`e15`) change on every snapshot.

```bash
$S/pw.sh snapshot --filename=now.yml          # saved in $STATE_DIR/pw, grep it for roles and names
$S/pw.sh click "getByRole('button', { name: 'New collection' })"
$S/pw.sh fill "getByRole('textbox')" "Moodboard"
$S/pw.sh press Enter
$S/pw.sh --raw eval "location.pathname"
```

Handles that matter in this app:

| What            | Handle                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| New collection  | button `New collection` on `/library`                                                                                           |
| Add files       | the hidden `input[type=file]` (see below), or the dock buttons `Add file` / `Add website` / `Add new source`                    |
| Search          | combobox `Search collections and saves`; results are `option`s in the listbox `Suggestions`                                     |
| Settings        | button `Settings` in the dock; dialog opens at `?settings=general`; sidebar buttons `General`, `Data`; button `Close settings`  |
| Collection page | textbox with the name, button `Collection options` (menu items `Rename`, `Delete collection`), button `New folder`, link `Back` |
| A source card   | button `Open <name>`, button `Delete <name>`, image `<name>`                                                                    |

**Files cannot be added through the OS file picker.** Set them on the hidden input instead, which runs the app's real change handler:

```bash
$S/pw.sh run-code "async page => { await page.setInputFiles('input[type=file]', ['/abs/a.png', '/abs/b.md']); }"
```

The same works for `input[webkitdirectory]` (Settings → Data → Import folder), with a folder path.

**Fixtures.** `node $S/make-fixtures.mjs "$STATE_DIR/fixtures"` writes `verify-red.png`, `verify-blue.png` and `verify-note.md`. They are tiny, valid and different from each other. Do not use files from the person's disk.

Other scripts: `wait-ready.sh` (see Launch), `dump-state.sh` (see Evidence), `env.sh` (paths and port, sourced by the others).

## Evidence

Proof standards:

- Drive the real user path: buttons, inputs, keys. Do not call the app's actions or write to IndexedDB from `eval` to set up a state the user cannot reach. The one allowed shortcut is setting files on the hidden file input, because the OS picker cannot be automated.
- Capture the action and the resulting state, not only the last screen. Save an ARIA snapshot before and after, and a screenshot after.
- Check the side effects next to what is visible: `dump-state.sh` prints every IndexedDB record (collections and sources, with `collectionIds`, `kind`, `mimeType`, `deletedAt`) and every OPFS file with its size. A card on screen with no record or no file behind it is not a pass.
- Toasts vanish in seconds. Assert on state, or snapshot right after the click.
- Compression runs in the background after a file is added. A PNG can become `image/webp` a moment later, so wait about 2 seconds, or compare by name, never by `mimeType` or `storageKey` right after an add.

```bash
$S/dump-state.sh                                              # JSON on stdout
$S/pw.sh screenshot --filename=evidence/<feature>-<step>.png  # screenshot, with the app visible
$S/pw.sh snapshot --filename=evidence/<feature>-<step>.yml    # ARIA snapshot
```

Evidence goes under `$STATE_DIR/pw/evidence/`. playwright-cli refuses to write anywhere else. Downloads (an export zip) land in `$STATE_DIR/pw/.playwright-cli/`. Save `dump-state.sh` output with `> "$STATE_DIR/pw/evidence/<name>.json"`.

Feature recipes are in [`features/README.md`](features/README.md). Read it before driving, then follow the matching file. A proof that drives one entry point is incomplete when the feature file lists others.

## Cleanup

```bash
$S/cleanup.sh
```

It closes the browser session `mado-verify`, which throws away the profile and the library with it, and stops the dev server whose pid is in the pid file, but only after it confirms that the process is this skill's Vite. It never kills by process name, and keeps `$STATE_DIR/pw/evidence/`. Run it after every failed attempt too, so a broken run does not strand a browser or a port. It leaves `$STATE_DIR` and the fixtures in place; delete them by hand when the person wants the disk back.

Check that cleanup worked: `doctor.sh` must fail with "something listens on port" and `playwright-cli list` must not show `mado-verify`.

## Known limits

- **Website sources** need the API on port 4000. Not started here.
- **Sign-in** is off. Google needs real credentials, and the dev bypass keeps the app a guest.
- **Chrome's "Save as" picker** for export cannot be driven. Set `window.showSaveFilePicker = undefined` first, so the app takes the OPFS path that Safari and Firefox use. See `features/export-and-import.md`. The picker path itself is unverified by this skill.
- **Video** compression (mediabunny) and **drag and drop** of files are not covered. Only the file input is.
