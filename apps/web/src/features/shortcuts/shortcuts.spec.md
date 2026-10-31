# Shortcuts

## Purpose

Keyboard shortcuts for the library, so a user can search, select and delete without the mouse, and a list so the keys can be learned.

**Depends on:** none. **Used by:** the action dock (search), the source grid (select all, delete) and the settings dialog (the list, and the `?` key). See `apps/web/ARCHITECTURE.md`.

## Behavior

| Keys                         | What it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/` or `Cmd/Ctrl + K`        | Focuses the search bar in the dock                                                                        |
| `Cmd/Ctrl + A`               | Selects every source in the grid                                                                          |
| `Delete` or `Backspace`      | Deletes the selected sources: to the trash with an Undo toast, or in the trash, for good after a question |
| `?`                          | Opens Settings on the Shortcuts tab                                                                       |
| `Esc`                        | Clears the selection, or closes a panel (not part of this feature)                                        |
| `←` `→`, `E`, `Cmd/Ctrl + V` | Already exist in the detail dialog and the library (see `sources.spec.md`)                                |

- Shortcuts are off while a dialog or a menu is open, while the focus is in a text field, while an IME is composing, and for a held key. `Cmd/Ctrl + K` is the one that still works in a text field.
- `/` also works when scrolling has hidden the dock. The dock comes back, then the search bar takes focus.
- A key that has no meaning on the current page is left to the browser. `Cmd/Ctrl + A` on a page with no grid still selects the page text.
- Settings → Shortcuts shows the list. It is written by hand in `shortcut-list.ts`, so change it together with the keys.

## Decisions

- **2026-10 — One pure function decides what a key means** (`getShortcutAction`). It takes the event and three facts (is something selected, is the user typing, is a dialog open), so every rule is tested without a browser. `useShortcuts` only adds the listener.
- **2026-10 — Each caller passes only the actions it owns.** The dock owns search, the grid owns select and delete, the settings dialog owns `?`. Nothing registers keys it doesn't use, so the browser keeps the rest.
- **2026-10 — Delete takes the same path as the Delete button.** The Undo toast and the trash's "delete forever?" question are not repeated or skipped for the keyboard.
- **2026-10 — A dialog or a menu turns the shortcuts off** by looking for `role="dialog"`, `role="alertdialog"` or `role="menu"` in the page. Behind a dialog, `Cmd/Ctrl + A` and Delete would change a library the user cannot see, and Delete behind a card's open menu would remove the selection instead of what the menu was for. Only open menus and dialogs are in the page, so this never switches the keys off for good.
- **2026-10 — `Cmd/Ctrl + K` overrides the browser** where it focuses the address bar search (Firefox, Chrome on Linux). Apps with a search bar commonly do this, and `/` still works in the same place for anyone who minds.
- **2026-10 — The search bar is focused over a few frames.** The dock shows through a CSS transition, and in the very frame it starts, the bar still counts as hidden and refuses focus. `focusWhenVisible` tries again for up to five frames.
- **2026-10 — Space does not open the selected card.** A focused card is already a button, so Space and Enter open it. A focused select circle is a checkbox, where Space must toggle it. A global Space would fight both. The real fix for keyboard users is moving between cards with the arrow keys, which is not built.
- **2026-10 — The key is read from `event.key`,** not the key position. On layouts where `?` needs another key press, it still works.

## Known gaps

- `/` does nothing while cards are selected, because the dock is hidden behind the selection bar. Press Esc first.
- The list in Settings is not generated from the keys. It can drift.
- No `Cmd/Ctrl + Z` for undo. Only the toast's Undo button restores a deleted source.
- There is no arrow-key movement between cards, so a keyboard user can only reach a card by Tab.
- The Settings dialog now has five tabs. Five icons and Sign in on a very narrow phone were not checked.
