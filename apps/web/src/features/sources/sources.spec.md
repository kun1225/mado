# Sources

## Purpose

A source is one saved piece of inspiration: an image, a video, a website, or a text (`.txt`, `.md`).
Everything stays in the browser: the record in IndexedDB, the file in OPFS.

**Depends on:** `storage`, `collections`. **Used by:** `collections`, `search`, `export`, `import`. See `apps/web/ARCHITECTURE.md`.

## Behavior

### Adding

- Drop files on the library or on a collection card to add them there. Many files at once is fine; each one saves on its own, so one bad file does not lose the others.
- While files are dragged over the library or a collection's grid, the grid shrinks a little behind a frosted veil that spans the full page width (the grid bleeds to the page edge), and a card in the middle of the visible part says "Add 3 files to Library" (or "Drop to add to …" for one file) with the size limit. With reduced motion on, nothing scales; the veil and card only fade.
- Pasting a file or a URL adds it, unless the focus is in a text field.
- Only images, videos and text files (`.txt`, `.md`, `.markdown`), up to `MAX_FILE_MB`. Text files are limited to `MAX_TEXT_MB` (1 MB).
- The kind comes from the MIME type, then the extension: many systems give `.md` no type. Other `text/*` files (HTML, CSV, code) are rejected.
- A pasted URL becomes a website source with a preview. An X/Twitter post that has a video becomes a video source instead. If that download fails, it stays a website.
- If the preview fails, the toast says why: the server cannot be reached, the link is not valid, the link points to a private or local address, or the website could not be loaded.
- A whole folder can be imported from Settings → Data (see `import.spec.md`).

### Text sources

- The text lives in the record (`text: { body, format, fileName }`), not in OPFS. Like a website, its `storageKey` and media fields describe its optional **thumbnail**, an image or a video.
- **Card:** only the first sentence, in a serif font, at most 4 lines. The first Markdown heading wins; otherwise the first sentence of the first line with words, with Markdown signs removed. No fixed shape: the card grows with its text. A thumbnail sits under the text, inset by 6 px with corners parallel to the card's.
- **Detail dialog:** a paper sheet that scrolls. Markdown is drawn with GFM (tables, task lists); plain text keeps its line breaks. Raw HTML shows as text and never runs. Links open in a new tab with `rel="noreferrer"`. Remote images are never loaded; they show as a link with their alt text.
- **Editing:** the Edit button or <kbd>E</kbd> turns the sheet into a text box with the raw text. Save with the button or <kbd>⌘/Ctrl+S</kbd>. Empty text or text over 1 MB can't be saved. With unsaved changes, Cancel, closing and moving to another source ask "Discard your changes?". Saving changes only the body, never the name, note, link or collections.
- **Download** gives the text file, not the thumbnail.

### Compression

- After a file is added or replaced, it is shrunk in the background, one file at a time.
- Animated and vector images are never compressed.
- While a video is compressing, the viewer shows a spinner instead of the video.
- If the source was deleted or its file was replaced while compressing, the compressed result is thrown away.

### Detail dialog

- Arrow keys move to the previous/next source, except while typing in a field.
- Website sources that can be embedded show the live page in an iframe. Their stored image is a **thumbnail**, shown only in the details panel.
- Websites that cannot be embedded show their image. With no image, the viewer offers "Add a file".
- Opening a source grows it out of its grid card (FLIP), and closing shrinks it back into the card of the source shown last. An image or video flies on its own; a text sheet flies from its top, so its first line lands where the card's was; an embedded website flies its whole frame, showing its thumbnail until the page loads. Only the first source after opening flies; arrow keys swap without it. With no card on screen or reduced motion on, the dialog just fades.

### Replacing the file

- Use the toolbar button, the viewer's "Add a file" button, a drop on the viewer, or the panel thumbnail.
- The name, note, link and collections never change.
- A site that can be embedded stays a website, and only its thumbnail changes. Images and videos are allowed.
- A text stays a text. An image or video becomes its thumbnail; a `.txt` or `.md` replaces its text and keeps the thumbnail. A text file on any other kind is rejected.
- A site that cannot be embedded turns into an image or video source and loses its `site` preview, but keeps its link.
- Only one replace per source at a time. A second drop shows "Wait for the current replace to finish."
- Dropping a file on the panel, the toolbar or the backdrop does nothing. It never replaces the file and never adds a new source.

### Grid

- A card more than one screen above or below the visible area is **far**. Its image or video is removed, and only a box with the same size and a soft background stays.
- A card within one screen loads its media and fades it in once it has loaded.
- A video plays while at least half of it is on screen, and pauses otherwise. With reduced motion on, it never plays by itself.
- A video that went far and comes back starts again from the beginning.

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
- **2026-10 — The drop highlight also needs recent drag events (`useIsDragOver`).** react-dropzone reads the dragged files after `dragenter`. If that finishes after the drop, it sets the active state again and the "Drop to add" overlay never goes away. The highlight now shows only while `dragenter`/`dragover` fired in the last 500 ms, and a drop clears it at once.
- **2026-10 — The iframe drop overlay shows when a file drag starts anywhere in the window (`useIsDraggingFile`).** An iframe swallows drag events, so the overlay has to be in place before the drag reaches it.
- **2026-10 — The whole detail dialog blocks drops.** The dialog renders inside the library drop zone, and React events from portals bubble to React parents.
- **2026-10 — Website thumbnails are compressed like images.**
- **2026-10 — Videos are compressed in the browser (`mediabunny`), not on a server.** It costs nothing to run, the file never leaves the device, and later cloud uploads are smaller. A server would need `ffmpeg`, which Cloudflare Workers can't run.
- **2026-10 — The FLIP moves the viewer media, not the dialog.** The dialog covers the whole screen, so only the picture has a card to fly from. The popup's own CSS fade is turned off while it flies, because it would fade the media too; the toolbar and panel (`data-flip-chrome`) fade on their own. Base UI only waits for the popup's own animations before it unmounts, so the close adds an empty animation on the popup to hold it until the media lands.
- **2026-10 — Far grid cards unmount their media instead of hiding it.** Unmounting frees the decoded image, the video decoder and the blob URL. `display: none` on the card would break the grid, because `masonry-layout` would measure it as 0px tall. Cards stay in the DOM, so this is not full virtual scrolling.
- **2026-10 — `useInView` shares one `IntersectionObserver` per option set**, because hundreds of cards each owning one is much slower.
- **2026-10 — Drop feedback is "Stage": the grid sinks, a card steps forward.** Picked from a prototype round. Scale `0.96` from the center of the visible part, veil `bg/55` with a 4px blur, card scales `0.96 → 1`; enter `duration-slow`, exit `duration-base`, `ease-out-quart`. The spacing between the collection bar and the grid is the bar's `mb-5`, not padding on the drop zone, so the veil hugs the grid. Rejected: the old dashed border (it sat on the card edges and its pill covered the action dock), a cursor-following chip (easy to miss while looking at the grid), a top pill or label row (covered the first row of cards, and never says the size limit).
- **2026-10 — The drop veil covers one screen, not the whole grid.** The veil sticks to the top of the screen inside a box the size of the grid, so the blur never covers more than one screen, even in a very tall library. The blur is only on while dragging, because an idle `backdrop-filter` still keeps a GPU layer alive. The file count is read on `dragenter` of the drop zone only until the drag is active, not on every element in the window. The card and the scale origin follow scroll once per frame while dragging.
- **2026-10 — Text lives in the record, not in OPFS.** A text source needs the one file slot for its thumbnail, like a website. The card can show its first sentence on first paint with no file read, which `masonry-layout` needs for the right height. Search can read it later, and when sources move to the cloud (Postgres + R2), the text goes into a Postgres column and only the thumbnail goes to R2.
- **2026-10 — Plain editing, not a rich editor.** A text box with the raw Markdown keeps the file the user downloads exactly as they typed it. A rich editor is a big dependency and can change the Markdown when it writes it back.
- **2026-10 — Markdown with `react-markdown` + `remark-gfm`, without `rehype-raw`.** It never turns raw HTML into elements and drops `javascript:` links, so no sanitizer is needed.
- **2026-10 — Thumbnails can be videos.** The card, panel and viewer pick `<video>` or `<img>` from the thumbnail's `mimeType`, not from the source's kind.
- **2026-10 — Tags are removed from the UI.** A source can be in many collections, so tags were a second way to group the same things, and nothing read them (no search, no filter). The `tags` field stays on the record, always `[]` for new sources, so old data and old exports still load without a migration. Bring tags back only with a way to use them, such as filtering inside a collection.

## Known gaps

- Every card stays in the DOM. With many thousands of sources, the DOM itself gets slow. The fix is our own column math from the aspect ratios, rendering only visible cards.
- While a file drag scales the grid, fixed elements inside it (like the selection bar) move with the grid until the drag ends.
- If a compression is reading a file at the moment a replace deletes it, the compression fails silently. There's no toast, and the new file still gets its own compression.

## Planned

- **More file types** (see "More file types" in `docs/roadmap.md`). Text (`.txt`, `.md`) is done; font, PDF and voice come next.
- **Text sources, later:** search inside the text, a way to remove a thumbnail, a "new note" with no file, and files that are not UTF-8 (today they show broken letters).
- **Drop a folder.** Dropping a folder on the library runs the same import as Settings → Data (see `import.spec.md`). It needs `webkitGetAsEntry` to read the folder from the drop.
- **A more fun embed loading state.** While an embedded site loads in the detail dialog, show something friendly and human instead of a plain wait. Idea: two drawn eyes that look around, as if searching for the page.
- **Copy an image to paste in Figma** (roadmap phase 0, small enough to ship before or with the launch). Cmd/Ctrl+C on a selected card, or a "Copy image" button in the detail dialog, puts the image on the clipboard. Pasting in Figma (or Slack, Keynote, Docs) gives the picture.
  - Why: designers collect in Mado but design in Figma. Copy and paste is the shortest bridge, and it needs no Figma plugin or account.
  - The clipboard gets a PNG made from the original file in OPFS, not the grid thumbnail. Browsers only allow `image/png` for images on the clipboard, so JPEG and WebP are turned into PNG. PNG keeps transparency.
  - Video: copies the frame on screen. Website: copies its preview image. An animated GIF: copies the first frame (the clipboard can't hold animation).
  - Safari needs the `ClipboardItem` made right inside the click or key press, so pass it a promise of the PNG instead of waiting for the PNG first.
  - A toast says "Copied". If the browser blocks the clipboard, the toast says so.
- **Facets and tags** (roadmap phase 1). Each source can have values for fixed brand facets: Emotion, Style, Color, Type and Industry. Each facet has a starting list of values, and the user can add their own. Free tags sit next to facets for anything else. The library and a collection can be filtered by facet values and tags.
  - Why fixed facets: AI (phase 4) fills the same facets, so it can compare and group sources. Free tags alone are too loose for that.
  - Color: a palette of 3–5 colors is taken from each image on the device, with no AI. It feeds the Color facet and palette cards on the canvas.
  - Adding facet fields to the source record is a schema change, so it follows the rules in `storage.spec.md`.
