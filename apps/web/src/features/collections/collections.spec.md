# Collections

## Purpose

Collections group sources. They can nest: a collection inside another one is called a **folder** in the UI. A source can be in many collections, or in none (then it lives only in the library).

**Depends on:** `storage`, `sources`. **Used by:** `sources`, `search`, `export`, `import`. See `apps/web/ARCHITECTURE.md`.

## Behavior

### Creating and naming

- A new collection is called "New collection". A new folder opens right after it is made.
- To rename, edit the title on the collection page. Enter saves, and Escape or an empty name restores the old name. If the save fails, the old name comes back.
- A name is trimmed and must be 1 to 100 characters.

### Card row

- The row of cards on the library and collection pages scrolls sideways with no scrollbar. Its edges fade where more cards are hidden, and the fade goes away at the start and end.

### Card menu

- Right-click a collection or folder card to open its menu. On touch screens, press and hold (500ms). The menu grows out of the point you pressed.
- The menu has **Rename**, **Change color** and **Delete**. Each one opens a dialog. Nothing changes until the dialog is confirmed.
- **Rename dialog:** the field starts with the current name, all selected. Enter or Save saves. The Save button is off while the name is empty or unchanged. If the save fails, the dialog stays open and shows an error.
- **Color dialog:** a row of color swatches, plus "Default". Picking one shows it on a folder preview right away; Save stores it. The color tints the folder pocket on the card.
- **Delete dialog:** the same confirm dialog as the collection page. Deleting from a card keeps you on the current page.
- While a dialog is saving or deleting, it can't be closed, so a failure is always shown.
- Holding a card on touch screens must not start text selection or the browser's link preview.

### What a collection shows

- By default, a collection shows its own sources **and** every source in the folders below it, each source once.
- **Settings → General → Show sources from folders** turns that off. Then a collection or folder shows only the sources saved right in it. Its folder cards still show. The library always shows every source.
- The setting is kept for each account (and once for guests) in `localStorage`, under `mado:show-folder-sources[:<accountId>]`. If storage is blocked or the value is bad, it reads as on.
- `saveCount` counts the same set as the page. It is worked out from the sources on every read and never stored.
- A card shows up to 3 previews, newest first, picked from the same set as the page.
- Dropping files on a collection card adds them to that collection.

### Color

- A collection has an optional color: `red`, `orange`, `yellow`, `green`, `blue`, `purple` or `pink`. No color means the default gray.
- Folders don't take their parent's color. Each one has its own.

### Deleting

- Deleting asks for confirmation. From the collection page, it then goes to the library. From a card, it stays on the current page.
- A collection can't be restored. Its folders are deleted with it.
- A source that was only in the deleted collections goes to the trash. If it's restored, it comes back to the library.
- A source that is also in another collection just loses the deleted one and stays visible.

## Decisions

- **2026-09 — Deleting a collection is a hard delete, but its sources go to the trash.** Losing a folder is cheap. Losing saved inspiration is not.
- **2026-10 — Collections nest through `parentId`.** One model covers both collections and folders.
- **2026-10 — A parent shows everything in its folders, by default.** Otherwise, saving into a folder would make the source seem to disappear from the collection the user was browsing.
- **2026-10 — Showing folder sources is a setting, on by default.** With everything shown, it was hard to tell which folder you were in. On by default, so nothing changes until someone turns it off. Counts and card previews follow the setting, so a card never says more than its page shows.
- **2026-10 — The setting lives in `localStorage`, one key per account**, like recent searches. One yes/no value is not worth a new store and a database migration. It is not part of an export.
- **2026-10 — The setting is part of the React Query keys** (`[...collectionKeys.lists, flag]`, `[...collectionKeys.detail(id), flag]`, `[...sourceKeys.byCollection(id), flag]`). Flipping it shows the right data at once. Rename and color updates write to every cached variant and keep each one's own `saveCount`.
- **2026-10 — `saveCount` is worked out, not stored**, so it can never drift from the real sources.
- **2026-10 — Collection deletes run in one transaction** with the source updates, so collections and sources always change together.
- **2026-10 — Card actions use a context menu, not a visible "…" button.** Cards stay clean, and right-click / long-press is what people expect from folders. The collection page keeps its "…" button, so every action can still be found without a right-click.
- **2026-10 — Every card action opens a dialog.** A menu item that changes data at once is too easy to hit by mistake, especially after a long press.
- **2026-10 — Colors are stored as names, not hex values.** Each name maps to theme tokens, so a color looks right in light and dark mode and can be tuned later without a migration.
- **2026-10 — `color` is optional on the record.** Old records read as no color, so no database migration is needed (no store or index changes).
- **2026-10 — The collection page remounts when the collection changes.** A parent and its folders share sources. A reused page made the masonry slide those shared cards from their old spots, so moving between a folder and its parent looked like a jump.
- **2026-10 — Changing the color keeps `updatedAt`.** Lists sort by `updatedAt`, so the card would jump away right after you colored it. Renaming still moves it to the front, as before.

## Known gaps

- Folders can't be moved to another parent yet. `UpdateCollectionInput` only allows `name` and `color`.
- The card menu has no keyboard shortcut. Keyboard users can open the card and use the "…" menu on the collection page, or press the context-menu key / Shift+F10.
- The collection page's "…" menu has no "Change color" item yet.
