# Tags

A user tags a source in the detail panel, groups tags in Settings → Tags, and filters the library or a collection by tag. Spec: the "Tags" and "Colors" sections of `apps/web/src/features/sources/sources.spec.md`.

## Sub-features

- `tags-add` typing in the tag field shows nothing until the first letter, then the user's matching tags and `Create "…"`; Enter adds a chip.
- `tags-reuse` on a second source, typing part of an existing tag lists it with its count; picking it adds it.
- `tags-reject` a tag that breaks the rules (`a:b:c`, `!!`) shows an error on Enter and is not saved.
- `tags-backspace` Backspace in the empty field removes the last chip.
- `tags-groups-menu` Settings → Tags: the group menu on a row moves the tag; `New group…` asks for a name.
- `tags-groups-drag` dragging a tag name onto another group box, or onto `+ New group`, moves it. Escape mid-drag cancels and keeps Settings open.
- `tags-groups-rename` `Rename` on a group renames every tag in it, and a `?tags=` filter follows.
- `tags-show-groups` the `Show group names on tags` switch turns `style-minimal` into `minimal`.
- `tags-filter` the Filter menu lists the page's tags under group headings with counts; a pick narrows the grid and goes into `?tags=`. A reload keeps it.
- `colors` the panel shows swatches in the "Color palette" section after the URL; clicking one copies its hex.
- `tags-suggested` accepting a suggestion. Not reachable by a user until AI ships, so it is covered only by unit tests. Do not write `suggestedTags` from `eval`.

## How to get to it (user POV)

- Open a card (button `Open <name>`). The panel order is Name, URL, color buttons `Copy #rrggbb`, Collections, Tags (a combobox `Add a tag`), Note.
- `/library?settings=tags`, or Settings → `Tags`. Each group is a `region` named after the group (`No group` for the rest). Each row has a button `Group of <tag>`.
- On `/library` or a collection page: button `Filter` above the grid, shown once any source there has a tag.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, with `verify-red.png` and `verify-blue.png` added to the library (`add-source.md`).

- **Add.** Click `Open verify-red`. Focus the combobox `Add a tag`: no `listbox` yet. `pressSequentially('min')`: one `option` `Create “min”`. Fill `minimal`, Enter; then `style:Bold`, Enter. Chips read `minimal` and `style-bold`.
- **Reject.** Type `!!`, Enter. An `alert` says `Use short words, like "handmade" or "style:minimal".`
- **Reuse.** Escape twice, open `verify-blue`, type `min`: an option `minimal` with count `1`. Enter adds it.
- **Groups.** Go to `/library?settings=tags`. Click `Group of minimal`, then menu item `New group…`, fill the textbox `New group for minimal` with `look`, Enter. The region `look` holds `minimal`.
- **Drag.** Scroll the tag name into view first: a press outside the dialog closes it. Drag the name with `page.mouse` (down, a 30 px move, then onto another region's box, up). Press Escape before letting go to check that nothing moves and the dialog stays.
- **Filter.** Close Settings. Click `Filter`, pick an item, Escape. `location.search` has `tags=`; `reload` keeps it.

## Proof

- Snapshots and screenshots under `$STATE_DIR/pw/evidence/`.
- The stored tags and palette. `dump-state.sh` leaves them out, so read them with a read-only `run-code` that calls `indexedDB.open('mado')` and lists `name`, `tags`, `suggestedTags` and `palette` of every source.
