# Search

## Purpose

Find a collection, folder or source by its name, fast and on the device.

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

## Known gaps

- Search doesn't look at tags, notes or URLs yet.
