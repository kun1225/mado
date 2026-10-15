# Sources

## Purpose

A source is one saved piece of inspiration: an image, a video, or a website.
Everything stays in the browser: the record in IndexedDB, the file in OPFS.

**Depends on:** `storage`, `collections`. **Used by:** `collections`, `search`. See `apps/web/ARCHITECTURE.md`.

## Behavior

### Adding

- Drop files on the library or on a collection card to add them there. Many files at once is fine; each one saves on its own, so one bad file does not lose the others.
- Pasting a file or a URL adds it, unless the focus is in a text field.
- Only images and videos, up to `MAX_FILE_MB`.
- A pasted URL becomes a website source with a preview. An X/Twitter post that has a video becomes a video source instead. If that download fails, it stays a website.

### Compression

- After a file is added or replaced, it is shrunk in the background, one file at a time.
- Animated and vector images are never compressed.
- While a video is compressing, the viewer shows a spinner instead of the video.
- If the source was deleted or its file was replaced while compressing, the compressed result is thrown away.

### Detail dialog

- Arrow keys move to the previous/next source, except while typing in a field.
- Website sources that can be embedded show the live page in an iframe. Their stored image is a **thumbnail**, shown only in the details panel.
- Websites that cannot be embedded show their image. With no image, the viewer offers "Add a file".

### Replacing the file

- Use the toolbar button, the viewer's "Add a file" button, a drop on the viewer, or the panel thumbnail.
- The name, note, tags, link and collections never change.
- A site that can be embedded stays a website, and only its thumbnail changes. Only images are allowed.
- A site that cannot be embedded turns into an image or video source and loses its `site` preview, but keeps its link.
- Only one replace per source at a time. A second drop shows "Wait for the current replace to finish."
- Dropping a file on the panel, the toolbar or the backdrop does nothing. It never replaces the file and never adds a new source.

### Deleting

- Deleting moves a source to the trash, with an undo toast. The file stays in OPFS.
- Restoring only clears `deletedAt`.
- Hard delete is only for sources already in the trash. It removes the record and the file, so the UI must confirm first.
- Deleting a collection trashes the sources that were only in it. Sources that are also in another collection just lose that collection.

## Decisions

- **2026-10 — Replace writes the new file under a new `storageKey`.** If the save fails, the old file is still there. Also, `useMediaObjectUrl` reloads even when the new file is the same size.
- **2026-10 — The replace kind is decided inside the save transaction**, not from an earlier read. Another replace or compression could change the record in between.
- **2026-10 — Compression does not block replace.** `runCompression` checks that the `storageKey` is still the same before it writes, so a stale result is dropped.
- **2026-10 — The replace drop zone does not use react-dropzone's `disabled`.** `disabled` removes the drag handlers, so the drop would bubble up to the library zone and be added as a new source. Busy state is checked in `onDrop` instead.
- **2026-10 — The iframe drop overlay shows when a file drag starts anywhere in the window (`useIsDraggingFile`).** An iframe swallows drag events, so the overlay has to be in place before the drag reaches it.
- **2026-10 — The whole detail dialog blocks drops.** The dialog renders inside the library drop zone, and React events from portals bubble to React parents.
- **2026-10 — Website thumbnails are compressed like images.**

## Known gaps

- If a compression is reading a file at the moment a replace deletes it, the compression fails silently. There's no toast, and the new file still gets its own compression.

## Planned

- **Import a folder.** Drop a folder, or pick one with a file input. Every image and video inside becomes a source. Each subfolder becomes a folder (nested collection) with the same layout. Other files are skipped. Touches `collections`.
- **A more fun embed loading state.** While an embedded site loads in the detail dialog, show something friendly and human instead of a plain wait. Idea: two drawn eyes that look around, as if searching for the page.
