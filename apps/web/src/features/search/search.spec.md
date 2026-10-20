# Search

## Purpose

Find a collection, folder or source by its name, fast and on the device.

**Depends on:** `collections`, `sources` (types only), `storage`. **Used by:** the action dock. See `apps/web/ARCHITECTURE.md`.

## Behavior

- Search matches names only, with Fuse.js. A typo or two still matches, and the word can be anywhere in the name.
- It shows up to 5 collections and 6 sources. An empty query shows nothing.
- Recent searches: up to 5, newest first. Searching for the same text again moves it to the top (case doesn't matter). You can remove one or clear all.
- Recent searches stay in step across tabs.
- Each account has its own recent searches. A guest has one shared list on the device.

## Decisions

- **2026-10 — Search runs on the client, on data already loaded.** The library lives in the browser, so there's no server to ask.
- **2026-10 — The index is built once per data change** (`createSearchIndex`). Searching is the cheap part.
- **2026-10 — `threshold: 0.35` and `ignoreLocation: true`.** Names are long titles, and the matching word is often near the end.
- **2026-10 — Recent searches are in `localStorage`.** If storage is blocked (private mode), search still works and the list is just empty. Bad stored data is read as an empty list.
- **2026-10 — The server renders an empty recent list**, and the client fills it in after hydration. This avoids a hydration mismatch.
- **2026-10 — Rows show no "Collection" or "Save" label.** The group heading already says what a row is. This also drops the "Folder" label, so a folder looks like a collection.
- **2026-10 — One clip-path highlight slides between rows** (200ms ease-in-out), for mouse and arrow keys alike. Moving down the list feels like one surface, not rows blinking on and off.
- **2026-10 — With reduced motion, the bar still widens when it opens** (ease-in-out, no bounce). It grows in place and does not travel, so it is safe. The results panel only fades.

## Known gaps

- Search doesn't look at tags, notes or URLs yet.
