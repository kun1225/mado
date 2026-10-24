# Canvas

**Status:** planned (roadmap phase 2). Nothing here is built yet.

## Purpose

An infinite board inside a brand project. The designer places sources, writes notes, and groups things into frames. Later, AI places directions here, and frames become slides for the client.

**Depends on (planned):** `projects`, `sources`, `storage`. **Used by (planned):** `projects`. See `apps/web/ARCHITECTURE.md`.

## Behavior (planned)

### Moving around

- Pan by dragging the empty board or with the trackpad. Zoom with pinch or Cmd/Ctrl + scroll.
- A "zoom to fit" action shows everything on the board.

### Items on the board

- **Source:** an image, video or website from the library, shown like its grid card. It can be moved and resized and keeps its aspect ratio. Opening it shows the source detail dialog.
- **Text:** a note with plain text.
- **Frame:** a named area. Items inside it move with it. Frames are the base for directions (phase 5) and slides (phase 6).
- **Palette card:** the colors taken from a source (see Facets in `sources.spec.md`).
- **Group:** several items that move together, with no visible frame.

### Adding sources

- Drag a source from a project's source list onto the board.
- Placing a source on a canvas also adds it to the project.

### Saving

- Every change is saved on the device right away. There is no save button.
- Undo and redo work for every change on the board.

## Decisions

- **2026-10 — The canvas is part of a project**, not its own thing (this replaces the old "Whiteboard" roadmap item).
- **2026-10 — The canvas stores source ids, not copies.** Replacing a source's file updates it on every canvas.

## Later

- AI places 2–3 directions as frames with sources, palette, type pair and keywords (phase 5).
- Present mode: frames become slides in the order the designer sets (phase 6).
- Share link, comments and votes on frames (phase 6).

## Open questions

### Canvas library

Research from 2026-10. The choice decides how much we build ourselves.

|                                                 | React Flow (`@xyflow/react`)                         | tldraw                                                                                                                                                                  | Excalidraw                                           |
| ----------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| License                                         | MIT, free. Pro (paid) only adds examples and support | Free in development. Production needs a license key: a paid commercial license (price on request), or a free hobby license with a watermark for non-commercial use only | MIT, free                                            |
| Our own React items (source cards, video, site) | Yes. Every node is a React component                 | Yes. Custom shapes are React components                                                                                                                                 | No custom shapes. Images and iframe embeds only      |
| Look                                            | No look of its own. We style it                      | Clean and polished                                                                                                                                                      | Hand-drawn look. Hard to make feel like a brand tool |
| Built in                                        | Pan, zoom, select, resize, groups, minimap           | Everything: drawing, text, frames, arrows, snapping, undo, multiplayer base                                                                                             | Drawing, text, arrows, images, frames                |
| We build                                        | Text editing, frames, snapping, undo, present mode   | Very little                                                                                                                                                             | Fighting its data model and look                     |
| Fit                                             | Good for a canvas of cards. Weak for free drawing    | Best fit, if the license cost works                                                                                                                                     | Poor fit                                             |

**Leaning: React Flow.** Mado's canvas is mostly cards, not drawing. React Flow is free, so the free version costs nothing to run, and our source cards can be reused as nodes. tldraw is the better tool, but a commercial license is a fixed yearly cost before Mado earns money. Look at it again when paid plans start (phase 5), or ask tldraw about the price for new companies.

### Others

- Does the canvas need free drawing (arrows, shapes) for the free launch, or are cards, text and frames enough?
