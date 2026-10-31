# Search

A user finds a collection or a source by its name from the search bar in the dock. A typo still matches. Enter opens the chosen result, and the text is kept in the recent searches. Spec: `apps/web/src/features/search/search.spec.md`.

## Sub-features

- `search-collection` a collection matches by name and opens its page.
- `search-source` a source matches by name.
- `search-typo` a close misspelling still matches.
- `search-empty` a query with no match says so.
- `search-recent` a search is kept under `mado:recent-searches`, newest first, with no duplicates by case.
- `search-note-url` a source also matches a word in its note or URL, exactly as typed. A typo in a note matches nothing.

## How to get to it (user POV)

- The search bar in the dock at the bottom of every `(app)` page: combobox `Search collections and saves`.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, plus a collection named `Moodboard` holding `verify-red.png` (from `collections.md` and `add-source.md`), and the page on `/library`.

- **Collection by name.** `$S/pw.sh fill "getByRole('combobox', { name: 'Search collections and saves' })" "Moodboard"`. In a snapshot, the listbox `Suggestions` has a group `Collections` with an `option` named `Moodboard`.
- **Typo.** Fill `Mdboard`. The same option `Moodboard` is listed.
- **Source.** Fill `verify-red`. A group `Saves` lists an `option` named `verify-red`.
- **No match.** Fill `zzzzqq`. The panel says `No matches for “zzzzqq”`.
- **Open a result.** Fill `Mdboard`, press `Enter`. The URL becomes `/collection/<Moodboard id>`.
- **Recent.** `$S/pw.sh --raw eval "localStorage.getItem('mado:recent-searches')"` → a JSON array whose first item is `Mdboard`. Clear the field and focus it: the group `Recent searches` lists `Mdboard`.
- **Proof.** Snapshot and screenshot with the results panel open for the collection, typo and empty steps, and the `localStorage` value, named `search-<step>`.

## Gotchas

- Use `fill`, not `press Control+a` then `type`: select-all did not replace the old text in testing, and the results mixed two queries.
- Search shows at most 5 collections and 6 sources, and an empty query shows nothing.
- Fuzzy matching is loose: `verifyred` matched every `verify-*` source. Assert that the expected option is present, not that it is the only one.
- Results are built from the data already loaded. Add files and wait for the card before searching for them.
- Collections match by name only. Sources match by name, note and URL. To test a note or URL, add them in the detail dialog (the `URL` textbox, then `+ Add a note`, then Enter to save), close it, and search a word that is only there. Search `ceramcs` for a note that says `ceramics`: no match, because notes are exact.
- Open the search bar with `/`; see `shortcuts.md`.
