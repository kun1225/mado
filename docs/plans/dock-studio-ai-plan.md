# Dock, Studio and AI chats per place

A plan for three connected changes. Nothing here is built yet.

1. **Dock and search** — a new dock with a better search bar (filters you can type), a small folder manager, and breadcrumbs. The library keeps its current layout.
2. **Studio** — a canvas is a source. Clicking it opens the Studio: the canvas, a library sidebar you can collapse, the same dock, and a "← Back" link.
3. **AI chats per place** — each place (the library, a collection or folder, a canvas) has its own chats. The ✦ button shows the chats for where you are.

Prototype: [`dock-studio-prototype.html`](dock-studio-prototype.html). Open it in a browser. The pill at the top switches between the three chat pickers we tried. **Per place** is the one we picked. Images come from picsum.photos, so it needs internet, and the AI replies are fake.

## Decision (2026-10)

Picked after two prototype rounds:

- **Layout:** the current library (tabs, folder cards, grid) plus the new dock. Breadcrumbs above the title.
- **Canvas:** a source in the library. Opening one goes to the Studio, not to the source detail dialog.
- **AI chats:** per place.

Rejected, and why:

| Option                | What it was                                                      | Why not                                                                        |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Mind (round 1)        | One big search field for search, filters and asking, like mymind | Deep folders were hard to see: you go down one level at a time                 |
| Workspace (round 1)   | Sidebar tree, filter bar, docked chat panel                      | Too busy for a moodboard tool. It turns the library into a file manager        |
| Ask (round 1)         | One input; every search becomes a block on the page              | Browsing without a goal felt weak, and AI is not free (phase 4+)               |
| Studio only (round 1) | Library and canvas side by side all the time                     | Kept as the Studio page, but not as the home screen                            |
| Tabs (round 2)        | Open chats as tabs, older ones in a menu                         | Gets crowded fast. Titles get cut off                                          |
| History (round 2)     | A list of all chats beside the conversation                      | The panel is wide and covers the canvas. Most chats are about one place anyway |

## Open questions

Answer these before phase B starts.

1. **Canvas vs. project.** `canvas.spec.md` says "the canvas is part of a project, not its own thing". This plan makes a canvas a library source. Options:
   - **(Recommended)** A canvas is a source. A project (later) points to its canvases, the same way it points to sources. One canvas can be in a collection and in a project.
   - A canvas lives only in a project, and the library shows it as a link. This keeps the old decision, but then "canvas as a source" is only a view.
2. **Delete flow in the folder manager.** The prototype deletes with an inline confirm row. `collections.spec.md` says every action opens a dialog. Recommended: reuse the existing delete and rename dialogs, so there is one way to delete.
3. **Where AI chats are stored.** Locally (IndexedDB, like everything else) or in the cloud (AI is cloud-only from phase 3). Recommended: locally first. The chat text is small, and it matches "free is local".

## Phases

| Phase | What ships                                                           | Needs                       | Roadmap phase |
| ----- | -------------------------------------------------------------------- | --------------------------- | ------------- |
| A     | New dock, typed filters, filter builder, folder manager, breadcrumbs | Nothing new                 | Now / Next    |
| B     | Canvas source, Studio route, library sidebar, drag to board          | Canvas library (React Flow) | 2             |
| C     | AI chats per place in the dock                                       | Cloud + AI API, a flag      | 4–5           |

Each phase ships alone. Phase A does not wait for the canvas.

---

## Phase A — Dock, search filters, folder manager, breadcrumbs

### What the user sees

- The dock has: **+** (add), then one bar with a **folder** button, the **search** field and (phase C) the **✦** button.
- Typing in search filters the grid on the page right away. Words like "videos", "last two months" or "2 months ago to last month" become filters. They show as dashed chips under "Understood". Enter keeps them as real chips.
- Focusing the search opens a sheet above the dock: "Understood", "Filter by" (Type, Date, Collection) and "Try typing".
- **Filter builder** popover with tabs: Type (Images, Videos, Websites, Text, Canvases), Date (presets, "Last N days/weeks/months", "From N … ago to N … ago", exact dates), Collection (the tree).
- Active filters show as chips above the grid. Click a chip to edit it, × to remove it, Backspace in an empty field removes the last one.
- **Folder manager** (folder button): columns like Finder. Click to open a folder. Each column has "New folder" at the bottom. Each row has rename and delete. Drag a card onto a row to add the source to that folder.
- **Breadcrumbs:** `Library / Brand work / Nike — Air Max refresh` next to the All / Deleted tabs. Each part is a link and a drop target.

### Files

New files are kebab-case. Types go in their own `*.type.ts` file.

| File                                                             | New or changed | What                                                                                        |
| ---------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `features/search/search-query.ts`                                | New            | `parseSearchQuery`, `applySearchFilters`, the date helpers                                  |
| `features/search/search-query.type.ts`                           | New            | `SearchFilter`, `SearchDateFilter`, `ParsedSearchQuery`, `SearchState`                      |
| `features/search/search-query.test.ts`                           | New            | A table of typed phrases → filters                                                          |
| `features/search/hooks/search-state-hooks.ts`                    | New            | `useSearchState()` — reads and writes `q` and `filters` in the URL                          |
| `components/action-dock/index.tsx`                               | Changed        | New layout: add button + one bar (folders, search, ✦ later). A `placement` prop for phase B |
| `components/action-dock/action-dock-search.tsx`                  | Changed        | Becomes the input + chip count. The command-list results move out                           |
| `components/action-dock/action-dock-sheet.tsx`                   | New            | The sheet above the dock. Shows one of: search, folders, (chat in phase C)                  |
| `components/action-dock/action-dock-search-sheet.tsx`            | New            | "Understood", "Filter by", "Try typing", and "Go to folder" rows from `searchLibrary`       |
| `components/action-dock/action-dock-folders.tsx`                 | New            | The folder manager columns                                                                  |
| `components/search-filter/search-filter-builder.tsx`             | New            | The popover with Type / Date / Collection tabs                                              |
| `components/search-filter/search-filter-chip.tsx`                | New            | One chip: edit on click, remove on ×                                                        |
| `components/collection-breadcrumbs.tsx`                          | New            | The breadcrumb trail, used on the library and collection pages                              |
| `routes/(app)/library/route.tsx`                                 | Changed        | Breadcrumbs beside the tabs; `validateSearch` for `q` and `filters`                         |
| `routes/(app)/library/index.tsx`, `collection/$collectionId.tsx` | Changed        | Pass sources through `applySearchFilters` before `SourceGrid`                               |

### Reused, not rewritten

- `searchLibrary` + `createSearchIndex` (Fuse) — for the "Go to folder" rows and for text matching on names.
- `useRecentSearches` — "Recent" in the search sheet when the field is empty.
- `useCollections`, `useChildCollections`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection` — the folder manager.
- `CollectionRenameDialog`, `CollectionDeleteDialog` — rename and delete (see open question 2).
- `useUpdateSource` with `addCollectionIds` — dropping a card on a folder.
- `SourceGrid`, `SourceCard`, `Masonry` — unchanged; they just get fewer sources.
- `FLOATING_BAR`, `FLOATING_SURFACE`, `useHideOnScroll` — dock look and hide-on-scroll.

### Types

```ts
// search-query.type.ts
export type SearchRelativeUnit = 'day' | 'week' | 'month' | 'year';

// Relative dates are stored as amounts, not dates, so a saved link stays "last 2 months" tomorrow.
export type SearchDateFilter =
  | { kind: 'date'; mode: 'last'; amount: number; unit: SearchRelativeUnit }
  | {
      kind: 'date';
      mode: 'between';
      from: { amount: number; unit: SearchRelativeUnit };
      to: { amount: number; unit: SearchRelativeUnit } | null;
    }
  | { kind: 'date'; mode: 'exact'; from: string; to: string } // ISO dates
  | { kind: 'date'; mode: 'preset'; preset: 'today' | 'this-year' };

export type SearchFilter =
  | { kind: 'type'; kinds: SourceKind[] }
  | SearchDateFilter
  | { kind: 'collection'; collectionId: string };

export type ParsedSearchQuery = { filters: SearchFilter[]; rest: string };

export type SearchState = { q: string; filters: SearchFilter[] };
```

### Data flow

```text
keyboard ─▶ dock input ─▶ useSearchState().setQuery(q)      (URL ?q=)
                              │
URL (q, filters) ─▶ route ─▶ parseSearchQuery(q) ─▶ { filters: typed, rest }
                              │
useAllSources / useSources ─▶ applySearchFilters(sources, [...kept, ...typed], rest, now)
                              │
                              ▼
                         SourceGrid (same component, fewer items)

Enter ─▶ commitTypedFilters(): typed filters move into ?filters=, rest stays in ?q=
builder / chip ─▶ setFilters(next)                          (URL ?filters=)
folder row / breadcrumb ─▶ navigate to /collection/$id      (search params kept)
drop card on folder ─▶ useUpdateSource({ addCollectionIds: [id] })
```

**Why the URL:** back and forward work, a refresh keeps the search, and there is no new store. It also follows the existing `?source=` param for the detail dialog.

### Control flow

- **Focus search** → sheet = `search`. **Blur** (focus leaves the dock and no popover is open) → sheet closes.
- **Folder button** → sheet = `folders` (toggle). **+** → add menu (today's add-source actions).
- Only one sheet at a time. Escape closes the popover first, then the sheet.
- **Enter** in search: if there are typed filters → keep them; else do nothing (the grid already shows results).
- **Backspace** in an empty field → remove the last kept filter.
- Leaving a collection keeps `q` and `filters`, so you can search, then move between folders.
- The dock still hides on scroll, but never while the sheet is open or focus is inside it (today's rule).

### Pseudo code

```ts
// search-query.ts
export function parseSearchQuery(text: string): ParsedSearchQuery {
  let rest = text;
  const filters: SearchFilter[] = [];
  // Order matters: "2 months ago to last month" must win over "last month".
  rest = takeRange(rest, filters); // "<n> <unit> ago to <n> <unit> ago | last <unit> | now"
  rest = takeLastN(rest, filters); // "last|past <n> <unit>s", words "two".."twelve" too
  rest = takeLastOne(rest, filters); // "last week|month|year"
  rest = takePresets(rest, filters); // "today", "this year"
  rest = takeKinds(rest, filters); // "images", "photos", "videos", "sites", "canvases"… → one type filter
  rest = takeCollection(rest, filters); // "in <collection name>", longest name first
  return { filters, rest: squashSpaces(rest) };
}

export function applySearchFilters(sources, { filters, text, now }) {
  const words = toWords(text);
  return sources.filter(
    (source) =>
      filters.every((filter) => matchesFilter(source, filter, now)) &&
      words.every((word) => haystack(source).includes(word)),
  );
}

// *** resolveDateRange ***
function resolveDateRange(
  filter: SearchDateFilter,
  now: Date,
): { from: Date | null; to: Date | null } {
  // 'last'    → { from: now - amount unit, to: null }
  // 'between' → { from: now - from, to: to ? now - to : null }, swap if from > to
  // 'exact'   → { from: startOfDay(from), to: endOfDay(to) }
  // 'preset'  → today: startOfDay(now); this-year: Jan 1
}
```

```tsx
// action-dock-folders.tsx
function ActionDockFolders({ currentId }) {
  const collections = useCollections();
  const path = ancestorIds(currentId, collections); // [root, …, current]
  const columns = [null, ...path]; // one column per level
  return columns.map((parentId) => (
    <FolderColumn
      parentId={parentId}
      items={childrenOf(parentId)}
      onOpen={(id) => navigate(toCollection(id))}
      onCreate={() => createCollection({ parentId })} // then open rename
      onRename={(c) => openRenameDialog(c)}
      onDelete={(c) => openDeleteDialog(c)}
      onDropSource={(sourceId, id) =>
        updateSource({ id: sourceId, addCollectionIds: [id] })
      }
    />
  ));
}
```

### Spec updates in the same commit

- `search.spec.md`: search now filters the page, typed filters, the builder, URL params. Replace "matches names only" and the 5/6 result limits.
- `collections.spec.md`: folder manager, breadcrumbs, dropping a card on a folder.
- `ARCHITECTURE.md`: `search` now reads `collections` for the "in <name>" filter.

---

## Phase B — Canvas as a source, and the Studio

### What the user sees

- "New canvas" in the **+** menu. A canvas card in the grid shows a small preview of the board and "Canvas · N items".
- Clicking a canvas goes to `/canvas/$canvasId`. It does not open the source detail dialog.
- **Studio:** top left "← Library" (or "← <collection name>", the place you came from). A library sidebar with the same cards in two columns, breadcrumbs and active filters. A collapse button, also `[`. The canvas title and item count. The same dock at the bottom of the canvas.
- The dock search filters the sidebar. Typing while the sidebar is closed opens it.
- Drag a card from the sidebar onto the board to place it. The current canvas card in the sidebar has a ring.

### Files

| File                                                 | New or changed | What                                                                          |
| ---------------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `features/sources/source-types.ts`                   | Changed        | `SourceKind` gains `'canvas'`; `Source` gains optional `canvas`               |
| `features/canvas/canvas.type.ts`                     | New            | `CanvasContent`, `CanvasItem`, `CanvasNote`, `CanvasViewport`                 |
| `features/canvas/canvas-actions.ts`                  | New            | `createCanvas`, `updateCanvasContent` (zod-checked)                           |
| `features/canvas/canvas-hooks.ts`                    | New            | `useCanvas(id)`, `useCreateCanvas`, `useUpdateCanvasContent` (debounced save) |
| `features/canvas/canvas-actions.test.ts`             | New            | With `fake-indexeddb`                                                         |
| `routes/(app)/canvas/$canvasId.tsx`                  | New            | The Studio page. `validateSearch`: `from` (collection id or nothing)          |
| `components/studio/studio-layout.tsx`                | New            | Sidebar + main, collapse state                                                |
| `components/studio/studio-sidebar.tsx`               | New            | Back link, collapse button, breadcrumbs, compact `SourceGrid`                 |
| `components/studio/studio-board.tsx`                 | New            | React Flow board; source cards as nodes; drop target                          |
| `components/source-card.tsx`                         | Changed        | Canvas preview body; open = navigate for canvases                             |
| `features/sources/hooks/source-interaction-hooks.ts` | Changed        | `useSourceDetail` sends canvases to the Studio, not to `?source=`             |
| `components/action-dock/index.tsx`                   | Changed        | `placement="pane"`: absolute inside the canvas pane, not fixed to the window  |

### Storage

A canvas is a **source record** with `kind: 'canvas'` and a `canvas` field. No file in OPFS, so `storageKey` is null. No new store and no `DATABASE_VERSION` change — the same way text sources added `text` (see `storage.spec.md`). It gets trash, collections, export and search for free.

```ts
// canvas.type.ts
export type CanvasItem = {
  id: string;
  sourceId: string;
  x: number;
  y: number;
  width: number;
};
export type CanvasNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
};
export type CanvasContent = {
  items: CanvasItem[];
  notes: CanvasNote[];
  viewport: { x: number; y: number; zoom: number };
};
```

Items store source ids, not copies (canvas spec decision). A source in the trash shows as a gray "In the trash" card on the board.

### Data flow

```text
SourceCard (canvas) ─click─▶ navigate('/canvas/$id', { search: { from: currentCollectionId } })
/canvas/$id ─▶ useCanvas(id) ─▶ StudioBoard (React Flow nodes from items + notes)
board change ─▶ local state ─▶ debounced useUpdateCanvasContent ─▶ IndexedDB ─▶ invalidate source lists
sidebar card ─drag─▶ dataTransfer 'application/x-mado-source' ─drop─▶ add CanvasItem at drop point
dock search ─▶ same useSearchState ─▶ sidebar grid
"← Back" ─▶ navigate(from ? '/collection/$from' : '/library')
```

### Control flow

- Collapse state is kept per account in `localStorage` (like the folder sources setting). Hidden sidebar = `inert`, so Tab skips it.
- Back target: `from` param if that collection still exists, else the library.
- Saving: every change is saved right away (debounced ~400ms). Undo/redo is canvas-library work and is out of scope for this plan.
- Mobile (< 760px): the sidebar becomes a drawer over the board.

### Pseudo code

```tsx
// routes/(app)/canvas/$canvasId.tsx
function CanvasStudioPage() {
  const { canvasId } = Route.useParams();
  const { from } = Route.useSearch();
  const canvas = useCanvas(canvasId);
  if (canvas.isPending) return <StudioSkeleton />;
  if (!canvas.data) return <CanvasMissing />;
  return (
    <StudioLayout
      sidebar={<StudioSidebar backTo={from} currentCanvasId={canvasId} />}
      board={<StudioBoard canvas={canvas.data} />}
      dock={<ActionDock placement="pane" />}
    />
  );
}
```

### Spec updates in the same commit

- New `canvas.spec.md` behavior (replaces "planned"), and the answer to open question 1.
- `projects.spec.md`: how a project points to canvases.
- `sources.spec.md`: the canvas kind; opening a canvas.
- `export.spec.md`: canvases in `library.json`.
- `ARCHITECTURE.md`: `canvas` → `sources`, `storage`; a Studio key flow.

---

## Phase C — AI chats per place

Behind a feature flag (`aiChat`, see `flags.spec.md`) until the cloud and AI phases ship.

### What the user sees

- **✦** in the dock opens the chat sheet. The search field becomes the chat input ("Ask about this canvas or your library…").
- The header shows the chat title with a ▾, and "2 chats on this canvas" / "No chats here yet". **+** starts a new chat here.
- Opening ✦ picks the **latest chat for this place**. If there is none, it shows a new empty chat with three suggestions.
- The ▾ menu has three parts: **On this canvas / In <collection>** (chats here), **New chat here**, and **Elsewhere** (all other chats, with their place and age).
- Picking a chat from elsewhere shows a bar: "This chat started in **Nordic oat milk shelf study**. [Go there]".
- Moving to another folder or canvas with the sheet open switches to that place's latest chat.
- Every answer shows the sources it used. Actions: "Show in library" (applies its filters), "Make a canvas from these" (library), "Add to this canvas" (Studio).

### Rules

- A chat's place is set by its first message and never changes.
- A new chat is not saved until its first message, so empty chats never pile up.
- The title is the first question, cut to 48 characters.
- Deleting a collection or canvas keeps its chats. They show under "Elsewhere" as "Deleted canvas" / "Deleted folder".
- The library place is `library`. A folder is its own place (chats in "Logos" don't show in "Nike").

### Files

| File                                            | New or changed | What                                                           |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `features/ai-chat/ai-chat.type.ts`              | New            | `AiChat`, `AiChatPlace`, `AiChatMessage`                       |
| `features/ai-chat/ai-chat-actions.ts`           | New            | `listChats`, `createChat`, `appendMessage`, `deleteChat`       |
| `features/ai-chat/ai-chat-hooks.ts`             | New            | `useChatsForPlace(place)`, `useAllChats()`, `useSendMessage()` |
| `features/ai-chat/ai-chat.spec.md`              | New            | The rules above (add a row to the `AGENTS.md` table)           |
| `features/storage/database.ts`                  | Changed        | `DATABASE_VERSION` 4: new `aiChats` store, index on `placeKey` |
| `components/action-dock/action-dock-chat.tsx`   | New            | Header + log + "elsewhere" bar                                 |
| `components/action-dock/ai-chat-place-menu.tsx` | New            | The ▾ menu: here / new / elsewhere                             |
| `components/action-dock/ai-chat-message.tsx`    | New            | One message: text, cited sources, actions                      |

### Types

```ts
// ai-chat.type.ts
export type AiChatPlace =
  | { kind: 'library' }
  | { kind: 'collection'; id: string }
  | { kind: 'canvas'; id: string };

export type AiChatMessage =
  | { id: string; role: 'user'; text: string; createdAt: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      sourceIds: string[];
      filters: SearchFilter[];
      createdAt: string;
    };

export type AiChat = {
  id: string;
  place: AiChatPlace;
  placeKey: string; // 'library' | 'collection:<id>' | 'canvas:<id>', for the index
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
};
```

### Data flow

```text
route (library | collection/$id | canvas/$id) ─▶ currentPlace() ─▶ placeKey
✦ ─▶ useChatsForPlace(placeKey) ─▶ latest chat, or a draft
input + Enter ─▶ useSendMessage(chatOrDraft, text)
     ├─ draft? createChat({ place, title: text }) first
     ├─ appendMessage(user)
     ├─ AI API (cloud, phase 4+) with: question, place context (canvas items / collection ids), library index
     └─ appendMessage(assistant, sourceIds, filters) ─▶ invalidate chat queries
"Show in library"   ─▶ useSearchState().set({ filters, q })
"Add to this canvas" ─▶ useUpdateCanvasContent(add items)
"Go there"          ─▶ navigate(placeToRoute(chat.place)), keep the chat open
```

### Pseudo code

```ts
// ai-chat-hooks.ts
export function useActiveChat() {
  const place = useCurrentPlace();
  const chats = useChatsForPlace(placeKeyOf(place));
  const [pickedId, setPickedId] = useState<string | null>(null);
  // Moving to another place drops the old pick, so the new place shows its own latest chat.
  useEffect(() => setPickedId(null), [placeKeyOf(place)]);
  const picked = useChat(pickedId);
  const chat = picked.data ?? chats.data?.[0] ?? null;
  return {
    chat,
    isElsewhere: chat !== null && chat.placeKey !== placeKeyOf(place),
    pick: setPickedId,
    startNew: () => setPickedId(DRAFT),
  };
}
```

---

## How we verify

### Phase A

- **Unit (`search-query.test.ts`):** a table of phrases → filters, run with a fixed `now`:
  `"videos from the last two months"`, `"images 2 months ago to last month"`, `"last week"`, `"this year"`, `"canvases in Brand work"`, `"pricing websites"`, words that look like filters but aren't ("last minute changes"), and a range given in the wrong order.
- **Unit:** `applySearchFilters` with sources on both edges of each date range.
- **Hook test:** `useSearchState` round-trips filters through the URL; bad URL data is read as no filters.
- **Actions:** dropping a source on a folder adds the id once (no duplicates).
- **E2E (Playwright):** type a phrase → Enter → chips show and the grid shrinks; edit a chip; Backspace removes it; the folder manager creates, renames and deletes a folder; breadcrumbs navigate; refresh keeps the search.
- **Manual:** keyboard only (Tab, Enter, Escape order), reduced motion, dark mode, a 375px phone.

### Phase B

- **Actions (`fake-indexeddb`):** create a canvas, save content, trash and restore it; a canvas has no OPFS file.
- **E2E:** click a canvas card → Studio; "← Back" returns to the folder you came from; collapse with `[`; typing opens the sidebar; drag a card onto the board and reload → it's still there.
- **Export/import:** a library with a canvas round-trips through `library.json`.

### Phase C

- **Actions:** a draft is not saved until the first message; chats are listed per place, newest first; deleting a canvas keeps its chats.
- **Hook:** moving between places switches to that place's latest chat; picking an "elsewhere" chat sets `isElsewhere`.
- **E2E (with the AI API mocked):** ✦ on a canvas with no chats shows suggestions; send → the chat appears under "On this canvas"; open it from the library → "Go there" returns to the canvas.
- **Flag:** with `aiChat` off, the ✦ button does not render.
