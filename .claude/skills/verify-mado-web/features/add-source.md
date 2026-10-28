# Add a source

A user saves images and text files into the library, or straight into a collection. Each file becomes a card, a record in IndexedDB and, for images, a file in OPFS. A text source keeps its text in the record and has no OPFS file. A source can then be moved to the trash. Spec: `apps/web/src/features/sources/sources.spec.md`.

## Sub-features

- `add-library` adds files from the library page, with no collection.
- `add-collection` adds files from a collection page and attaches them to it.
- `add-kinds` an image becomes kind `image`, a `.md` or `.txt` becomes kind `text`.
- `add-compress` a PNG is compressed in the background, and its stored type can change.
- `add-reject` a file of an unsupported type is refused.
- `delete-trash` the card's Delete button moves the source to the trash.

## How to get to it (user POV)

- Library page `/library`: dock button `Add file`, then pick files. (Driven by setting files on the hidden `input[type=file]`.)
- A collection page `/collection/<id>`: the same dock button, which adds to that collection.
- Drop files on the page, or on a collection card. Not driven here.
- Paste a file. Not driven here. Paste or `Add website` for a URL needs the API, so it is not covered.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, with the page on `/library` and `$S/wait-ready.sh` printing `hydrated`.

- **Add to the library.** Set two files on the hidden input: `$S/pw.sh run-code "async page => { await page.setInputFiles('input[type=file]', ['$F/verify-red.png', '$F/verify-note.md']); }"`. Wait 2 seconds, then `$S/pw.sh snapshot --filename=evidence/add-source-library.yml`. Two buttons appear: `Open verify-red` and `Open verify-note`, with an image named `verify-red`.
- **Check the records.** `$S/dump-state.sh`. `sources` has `verify-red` with `kind: "image"`, `collectionIds: []`, `deletedAt: null` and a `storageKey`, and `verify-note` with `kind: "text"` and `storageKey: null`. `files` has exactly one entry, `media/<verify-red id>`, with `bytes` above 0.
- **Add into a collection.** Choose `New collection` (it opens `/collection/<id>`; run `$S/wait-ready.sh` if you used `goto`), then set `$F/verify-blue.png` on the hidden input. Wait 2 seconds. `Open verify-blue` appears on the page. `dump-state.sh` shows `verify-blue` with that collection's id in `collectionIds`.
- **Compression.** `dump-state.sh` after the wait: `verify-blue` is `image/webp` and its file is smaller than the PNG, or it is still `image/png` when compression found no gain. The record's `storageKey` and the name of the one file in `files` stay equal.
- **Reject.** Set a file that is not an image, video, `.txt` or `.md`, such as `$STATE_DIR/fixtures/verify-bad.json` (write any text to it first). No card appears, `dump-state.sh` shows no new source, and a toast says `Only images, videos and text files are supported`. Snapshot straight after the set, because the toast fades.
- **Delete to the trash.** Choose `Delete verify-red`. The card disappears and an undo toast shows. `dump-state.sh` shows `verify-red` with a non-null `deletedAt`, and its file is still in `files`. Go to `/library`, choose the tab `Deleted` (URL `/library/deleted`): a `figure` named `verify-red` is listed, with a checkbox `Select verify-red`. Its `Delete verify-red` button there is the hard delete: do not press it without meaning to.
- **Proof.** For each step above: the ARIA snapshot, a screenshot (`$S/pw.sh screenshot --filename=evidence/add-source-<step>.png`) and the `dump-state.sh` JSON saved as `evidence/add-source-<step>.json`.

## Gotchas

- Run `$S/wait-ready.sh` after every `open`, `goto` and `reload`. Files set before React hydrates are lost, and setting the same files again is then ignored, so reload the page and set them once more.
- `input[type=file]` is hidden and there may be more than one on a page (the dock, the empty state). `setInputFiles` on the first match is enough: all of them call the same add path.
- Compression changes `mimeType` and may change the file size. Never assert on those right after an add.
- A card on screen is not proof. The record and the OPFS file are.
- The trash keeps the file. Only a hard delete from the `Deleted` tab removes it, and that asks for a confirmation.
- Two sources can have the same name (an import of the same fixtures). Match by id from `dump-state.sh`.
- The undo toast and the error toast disappear in a few seconds.
