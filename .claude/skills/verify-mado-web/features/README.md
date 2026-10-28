# Mado web verification map

This directory is the maintained source for verifying what a user does in the Mado web app. Read this index before driving the app, then use the matching feature file as the recipe. Update the file in the same commit as a behavior change; the behavior itself is described in the feature's `*.spec.md` under `apps/web/src/features/`.

## Baseline preconditions

- The dev server was started by `scripts/launch.sh` on port 3199, and `scripts/doctor.sh` exits 0.
- The browser was opened with `scripts/pw.sh open http://localhost:3199/library`, and `scripts/wait-ready.sh` printed `hydrated`. The profile is new, so the library is empty: no collections, no sources, no OPFS files, no `mado:*` keys in `localStorage`.
- Fixtures exist: `node scripts/make-fixtures.mjs "$STATE_DIR/fixtures"`.
- In the recipes, `S=.claude/skills/verify-mado-web/scripts` and `F=$STATE_DIR/fixtures` (`$STATE_DIR` is `$MADO_VERIFY_DIR`, or `${TMPDIR:-/tmp}/mado-verify`; `. $S/env.sh` sets it).
- Never drive an instance this run did not start.

## Driving conventions

- Start every recipe from the baseline, unless its preconditions say it continues from another one. Reset by running `scripts/cleanup.sh`, then `launch.sh` and `pw.sh open` again.
- Prefer roles and accessible names (`getByRole('button', { name: '…' })`) over CSS selectors and refs.
- Add files only by setting them on the hidden file input, as `SKILL.md` shows, and only after `scripts/wait-ready.sh` has printed `hydrated`. Run it again after every `goto` and `reload`; a click that stays inside the app does not need it.
- Wait about 2 seconds after adding files before reading `mimeType` or `storageKey`: compression rewrites them.
- Run the same file name in more than one place only on purpose. Names are not unique ids.

## Proof and skip reporting

- Every recipe ends with a **Proof** step: an ARIA snapshot, a screenshot, and `scripts/dump-state.sh` output, saved under `$STATE_DIR/pw/evidence/` and named `<feature>-<step>`.
- Mutation proof includes the second view: the stored record or file, not only the card on screen.
- Report an unreachable path with the command tried and the unmet precondition. Do not report a skipped entry point as verified through another one.

## Features

- [Add a source](./add-source.md): add images and text files to the library and to a collection through the file input, check the records, the OPFS files and the background compression. Covers delete to the trash.
- [Collections](./collections.md): create, rename, delete a collection, the sources it keeps and the ones that go to the trash.
- [Search](./search.md): fuzzy name search, opening a result, recent searches.
- [Settings and theme](./settings-and-theme.md): the dialog, URL params, Light, Dark and System, and the folder sources switch.
- [Export and import](./export-and-import.md): export the library as a zip and read it, import a plain folder.
