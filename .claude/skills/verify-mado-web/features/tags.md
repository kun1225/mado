# Tags

A user tags a source in the detail panel and filters the library or a collection by tag. Spec: the "Tags" section of `apps/web/src/features/sources/sources.spec.md`.

## Sub-features

- `tags-add` a typed tag is cleaned (`Style: Minimal` → `style:minimal`) and saved on the record.
- `tags-reject` a tag that breaks the rules (`mood:x`) shows an error and is not saved.
- `tags-filter` the Filter menu lists the page's tags by facet with counts; a pick narrows the grid and goes into `?tags=`.
- `tags-filter-reload` a reload keeps the filter.
- `tags-filter-clear` removing the last filter chip shows every source and drops `?tags=`.
- `tags-suggested` accepting a suggestion. Not reachable by a user until AI ships, so it is covered only by unit tests. Do not write `suggestedTags` from `eval`.

## How to get to it (user POV)

- Open a card (button `Open <name>`). The panel has a heading `Tags` and a combobox `Add a tag`.
- On `/library` or a collection page: button `Filter` above the grid, shown once any source there has a tag.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, with `verify-red.png` and `verify-blue.png` added to the library (`add-source.md`).

- **Add.** Click `Open verify-red`. `fill "getByRole('combobox', { name: 'Add a tag' })" "Style: Minimal"`, `press Enter`. Then `handmade`, Enter. The panel has buttons `Remove style minimal` and `Remove handmade`.
- **Reject.** Fill `mood:x`, Enter. An `alert` says `Use short words, like "handmade" or "style:minimal".`
- **Filter.** `press Escape` to close the dialog. Click `Filter`. The menu has groups `Style` and `Other` with `menuitemcheckbox` items named `minimal, 1 source` and `handmade, 1 source`. Click the `minimal` item, press Escape. `location.search` is `?tags=style%3Aminimal`, and only `Open verify-red` is on the page.
- **Reload.** `reload`, `wait-ready.sh`. The search and the single card are still there.
- **Clear.** Click `Remove style minimal` next to `Filter`. `location.search` is empty and both cards show.

## Proof

- Snapshots and screenshots `tags-1-panel`, `tags-3-filtered`, `tags-4-reload` under `$STATE_DIR/pw/evidence/`.
- The stored tags. `dump-state.sh` leaves `tags` out, so read them with a read-only `run-code` that calls `indexedDB.open('mado')` and lists `name`, `tags` and `suggestedTags` of every source. Expect `verify-red` to have `["style:minimal","handmade"]`.
