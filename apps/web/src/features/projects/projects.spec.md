# Projects

**Status:** planned (roadmap phase 2). Nothing here is built yet.

## Purpose

A brand project holds the work for one client brand: the brief, the sources picked for it, its canvases, and later its directions and strategy doc. The library stays global. A project only points to sources; it doesn't copy them.

**Depends on (planned):** `sources`, `canvas`, `storage`. **Used by (planned):** `canvas`, `search`. See `apps/web/ARCHITECTURE.md`.

## Behavior (planned)

### Creating

- A project needs only a name. Everything else can be filled in later.
- A new project starts with one empty canvas.

### Brief

- Fields: client name, what the brand does, audience, values (a few words), competitors, and words to avoid.
- Every field is optional and plain text.
- Why: the brief is what AI reads in phase 5 to write directions. A designer fills it in during the kickoff call.

### Sources

- The user adds sources from the library to a project. A source can be in many projects.
- Deleting a source from a project doesn't delete it from the library.
- A source moved to the trash disappears from the project, and comes back if it's restored.

### Canvases

- A project has one or more canvases. The user can add, rename, reorder and delete them.
- Deleting the last canvas isn't allowed, so a project always has a place to work.

### Deleting

- Deleting a project deletes its brief and canvases. The sources stay in the library.

## Decisions

- **2026-10 — A project is the container for client work**, not a collection. A collection is a way to sort the library. A project is a piece of client work with a brief, canvases and, later, a strategy.
- **2026-10 — Projects are local-first** like the rest of the free version. Cloud backup comes in phase 3.

## Later

- Directions (phase 5): 2–3 brand directions, each with its sources, palette, type pair, keywords and reasons.
- Strategy doc (phase 5): positioning, personality, tone of voice, do/don't. Each point links to its sources.
- Present and share (phase 6): see `canvas.spec.md`.

## Open questions

- Does the brief need structured fields (like a values list), or is plain text enough for AI?
- Should a project show its sources as a grid, like a collection, or only on its canvases?
