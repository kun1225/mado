# Collections

A user groups sources in collections, which can nest as folders. A collection is created from the library, renamed in place on its page, and deleted from its "Collection options" menu. Deleting a collection sends the sources that were only in it to the trash. Spec: `apps/web/src/features/collections/collections.spec.md`.

## Sub-features

- `collection-create` the `New collection` card creates "New collection" and opens its page.
- `collection-rename` the title on the collection page is editable; Enter saves, Escape restores.
- `collection-folder` `New folder` on a collection page creates a child collection.
- `collection-delete` the menu's `Delete collection` asks first, then removes the collection and trashes its own sources.
- `collection-card-menu` right-click a card for `Rename`, `Change color` and `Delete` dialogs. Not driven here (see Gotchas).

## How to get to it (user POV)

- `New collection` card at the start of the collection row on `/library`.
- `New folder` button on a collection page.
- The title field and the `Collection options` button on a collection page.
- A right-click or long-press on a collection card.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, on `/library`.

- **Create.** `$S/pw.sh click "getByRole('button', { name: 'New collection' })"`. The URL becomes `/collection/<id>`, and the title textbox holds `New collection`. `dump-state.sh` has one collection with `parentId: null`.
- **Rename.** `$S/pw.sh fill "getByRole('textbox')" "Moodboard"`, then `$S/pw.sh press Enter`. Read back with `$S/pw.sh --raw eval "document.querySelector('input').value"` → `Moodboard`, and `dump-state.sh` shows `name: "Moodboard"`.
- **Rename canceled.** Fill another name and press `Escape`. The field returns to `Moodboard`, and the record is unchanged.
- **Add sources, then a folder.** Set `$F/verify-red.png` on the hidden `input[type=file]` (see `add-source.md`). Choose `New folder`. A second collection exists with `parentId` equal to the first one's id, and the URL is the folder's page.
- **Parent shows folder sources.** Add `$F/verify-blue.png` while in the folder, then use link `Back`. The parent page shows both `Open verify-red` and `Open verify-blue` (folder sources are shown by default).
- **Delete.** On the parent page, choose `Collection options`, menu item `Delete collection`, and in the alert dialog `Delete this collection?` the button `Delete collection`. The URL becomes `/library`. `dump-state.sh`: the collection and its folder are gone, and the sources that were only in them have a non-null `deletedAt`.
- **Proof.** Snapshot and screenshot after create, rename, delete, plus the `dump-state.sh` JSON, named `collections-<step>`.

## Gotchas

- The title is an `input`, so `getByRole('textbox')` finds it. On a page with the settings dialog open or with the search combobox focused there are other textboxes.
- Saving the rename happens on blur or Enter. `fill` alone does not save.
- A source in two collections is not trashed when one of them is deleted. Only the sources that were in no other collection go to the trash.
- The Delete item in the options menu is named `Delete collection`, and the confirm button has the same name. Scope the second click to the `alertdialog`.
- The card's context menu opens from a right-click (`mousedown right`) or a 500 ms long press. It was not proven by this skill. The collection page's `Collection options` menu is the reliable path, and it has no `Change color`.
