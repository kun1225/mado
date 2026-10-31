# Shortcuts

A user searches, selects and deletes from the keyboard, and `?` shows the list. Spec: `apps/web/src/features/shortcuts/shortcuts.spec.md`.

## Sub-features

- `shortcut-search` `/` and `Cmd/Ctrl+K` focus the search bar, also after scrolling has hidden the dock.
- `shortcut-typing` `/` typed in a text field is just a character. `Cmd+A` in a field selects the text, not the cards.
- `shortcut-select-all` `Cmd/Ctrl+A` selects every card in the grid.
- `shortcut-delete` Delete moves the selection to the trash with an Undo toast. In `/library/deleted` it opens "Delete N files forever?" and removes nothing until confirmed.
- `shortcut-list` `?` opens `?settings=shortcuts`.
- `shortcut-dialog` with any dialog open, none of the keys above act.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, plus about 24 cards on `/library` (set the three fixtures on the file input 8 times), a viewport of `800x450` (`$S/pw.sh resize 800 450`) so the page scrolls, and the focus on the page: `$S/pw.sh --raw eval "document.activeElement.blur()"`.

- **Search, top of page.** `$S/pw.sh press /`, then `$S/pw.sh --raw eval "document.activeElement.getAttribute('role')"` → `combobox`. Same for `Meta+k` and `Control+k`. `Escape` blurs it.
- **Search, dock hidden.** `$S/pw.sh --raw eval "window.scrollTo(0,0)"`, wait, then `window.scrollTo(0,1200)` in a separate call. `document.querySelector('[data-scrolled-away]')` is not null. Press `/`: the combobox has focus and `[data-scrolled-away]` is gone. The page must be taller than the viewport, or the dock never hides.
- **Typing.** Press `/`, then `$S/pw.sh type "a/b"`: the field value is `a/b`. Press `Meta+a`: no `[role=checkbox][aria-checked=true]` exists.
- **Select all and delete.** Blur the field, press `Meta+a`: the selection bar `[data-source-selection-bar] p` says `24 selected`. Press `Delete`: no `[data-source-card]` is left and a toast says `24 saves deleted`. The records have `deletedAt` set (dump-state).
- **Trash.** `$S/pw.sh goto http://localhost:3199/library/deleted`, `wait-ready.sh`, blur, `Meta+a`, `Delete`: one `[role=alertdialog]` says `Delete 24 files forever?`. dump-state still lists 24 records. While it is open, `/`, `Meta+a` and `Delete` change nothing. `Escape` closes it.
- **List.** Blur, press `?` (the key itself, not `Shift+/`). The URL is `?settings=shortcuts` and the dialog lists eight rows in `dt` elements.
- **Dialogs.** Open a card with its `Open <name>` button, blur the focus, press `Meta+a` and `Delete`: no selection bar, same card count.
- **At rest, no dialog is in the page:** `document.querySelectorAll('[role=dialog],[role=alertdialog]').length` → `0`. If this is not 0, every shortcut stays off.
- **Proof.** Screenshot after select all, after the trash question, and with Settings on Shortcuts, plus dump-state after the delete. Name them `shortcuts-<step>`.

## Gotchas

- `$S/pw.sh press Shift+/` sends `/` with Shift held, so it focuses search. Press `'?'` to send a real question mark.
- A dialog that was just closed stays in the page for its exit animation, so wait about a second before counting dialogs.
- The Undo toast lasts a few seconds. Click `Undo` right after the delete, or skip it.
- `dump-state.sh` fails with `SyntaxError: Unexpected token ';'` when the formatter has added a `;` at the end of `dump-state.js`. Run the code without that last `;`.
