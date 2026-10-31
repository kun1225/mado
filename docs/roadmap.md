# Roadmap

What we plan to build, in rough order. Details for near-term work live in each feature's spec (`## Planned`, or the whole spec for a feature that isn't built yet). Bigger ideas live here until they get their own spec.

## Where Mado is going

Mado is a brand design tool for solo brand designers, built around AI. You collect ideas, sort them by brand facets, and turn them into 2–3 brand directions on a canvas. Then you show the client why each direction works.

Every step of the product fits one step of a designer's work:

```text
Brief → Collect → Make sense → Directions → Present → Pick
(project) (library) (facets + AI) (canvas + AI)  (share)  (client vote)
```

Rules that shape every phase:

- **Solo designers first.** Teams come later. A share link is enough for clients.
- **AI only suggests.** Each AI result can be accepted, edited or rejected. The designer has the final say.
- **AI shows its sources.** Every direction or strategy point links to the sources it came from. Clients pay for the reasons, not for the moodboard.
- **Free is local, paid is cloud.** The library, facets, projects and canvas are free and stay on the device. AI, cloud backup and client links are paid, because they cost us money per use.
- **AI is opt-in.** Turning AI on means sending images and text to an AI API, so the user chooses it.

## Phases

Each phase ships alone. Mado is a side project, so phases are small.

| #     | Phase                  | What ships                                                                                                                                | Needs cloud?              | Spec                                                                                                                                         |
| ----- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Launch + Now/Next      | Mado branding and landing page (launch), copy an image to paste in Figma, drop a folder to import, a more fun embed loading state         | No                        | [`sources.spec.md`](../apps/web/src/features/sources/sources.spec.md)                                                                        |
| 1     | Facets                 | Tag sources by Emotion, Style, Color, Type and Industry, plus free tags. A color palette taken from images on the device. Filter by facet | No                        | [`sources.spec.md`](../apps/web/src/features/sources/sources.spec.md)                                                                        |
| 2     | Brand project + canvas | A project per client brand with a brief, picked sources and many canvases. A canvas with sources, text, frames, groups, and copy to Figma | No                        | [`projects.spec.md`](../apps/web/src/features/projects/projects.spec.md), [`canvas.spec.md`](../apps/web/src/features/canvas/canvas.spec.md) |
| 3     | Cloud base             | Accounts for AI, media upload, one-way backup, AI credits                                                                                 | **Yes**, unlocks the rest | —                                                                                                                                            |
| 4     | AI understanding       | Fill facets with AI, related sources, search by feeling ("calm, warm, handmade"), pull out palette, type style and keywords               | Yes                       | —                                                                                                                                            |
| 5     | AI synthesis           | 2–3 brand directions placed on the canvas, and a strategy doc (positioning, personality, tone, do/don't). Both show their sources         | Yes, paid                 | —                                                                                                                                            |
| 6     | Present and share      | Present mode (frames become slides), a share link that works without an account, comments and votes on frames, client picks a direction   | Yes, paid                 | —                                                                                                                                            |
| 7     | AI images              | Mood images to fill gaps, mockups, logo sketches                                                                                          | Yes, paid                 | —                                                                                                                                            |
| Later | Teams                  | Two-way sync, permissions, collaboration, brand guideline export, Figma export                                                            | Yes                       | —                                                                                                                                            |

## Clients

The web app is the first client. More clients come after the backend, in this order. Each one saves into the same cloud library through the same `/api/v1`.

| Order | Client            | What it does                                                                                   | Needs   |
| ----- | ----------------- | ---------------------------------------------------------------------------------------------- | ------- |
| 1     | Backend (phase 3) | Accounts, one API for every client, media upload                                               | —       |
| 2     | Chrome extension  | Save the page, or an image or video you right-click, into your library without leaving the tab | Phase 3 |
| 3     | iOS and macOS     | A share sheet action "Save to Mado", then browse the library. One SwiftUI project for both     | Phase 3 |

Why the backend is first: the library lives in the browser today (IndexedDB and OPFS). No other client can reach it, so every client needs the cloud base.

Why the extension is second: designers collect on a desktop browser, so it is where most saving happens. It is a small web project, and it reuses the web app's code and the API. Collecting is the step of the product that is most often repeated.

Why the native apps are last: they are a new codebase with a new release process (App Store review) and a new place to keep bugs. They come after the backend and the extension have proven that the library works across devices. iOS and macOS are one step because they can share one SwiftUI project.

### In parallel: canvas and AI

These run beside the clients, not after them.

- **Canvas (phase 2):** needs no cloud, so it can be built now while the backend is built. First pick the canvas library (see "Open questions" and `canvas.spec.md`).
- **AI (phases 4–5):** it needs images on a server, so it ships after the backend. Until then, research only: pick providers, test prompts on real sources, and estimate the cost per use. Throwaway scripts are fine; nothing ships before phase 3.

## Launch (target: a few weeks from 2026-10)

The launch is Mado's own brand and the landing page, on top of the library we have today. Facets, projects and the canvas (phases 1–2) come after the launch.

- **Mado branding:** name story, logo, colors, type and tone of voice. A brand design tool must look like it was made by a brand designer.
- **Landing page:** tells the brand-tool story from this roadmap, and shows the library working today. v1 has six sections and no waitlist: see [`plans/landing-page-v1.md`](plans/landing-page-v1.md).

Why: the launch gets people using the free library and gets feedback before we spend months on the canvas. The rest of phase 0 (folder drop, the fun loading state) can ship whenever it's ready.

## More file types

Mado saves images, videos and websites today. Designers also collect words, fonts, documents and sound, so more types come in this order:

| Priority | Type                 | What it is                                                                                                                           |
| -------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | Text (`.txt`, `.md`) | Notes, copy, brand voice, a client brief. A card shows the first lines; the detail dialog shows the whole text, with Markdown drawn. |
| 2        | Font                 | A card shows a type specimen in that font. Useful for the Type facet.                                                                |
| 3        | PDF                  | Brand guidelines and decks. A card shows page 1; the detail dialog scrolls the pages.                                                |
| 4        | Voice                | Audio notes and client calls. A card shows a waveform and a play button.                                                             |

Why text goes first: it is the cheapest to build (no codec, no preview image, nothing to compress) and it is the missing half of a brand project. The brief and the "why" behind a direction are words. Phase 4 AI reads text as easily as images, and the canvas can place text cards.

Why voice goes last: it needs a recorder or a transcript to be useful, and a transcript means AI (phase 4 or later).

Each type gets its own card and detail view, the same facets and tags as other sources, and the same drop, import and export paths. The spec of each type is written when it is picked up, in [`sources.spec.md`](../apps/web/src/features/sources/sources.spec.md).

## Order and why

1. **Facets before AI.** AI is only as useful as the facets it fills. Facets also make the free version better on their own.
2. **Project and canvas stay local.** They need no server, so they can be part of the free launch.
3. **Cloud comes before AI**, not after collaboration as planned before. AI needs images on a server, so the cloud base moves up.
4. **AI understanding before synthesis.** Directions are built from facets, embeddings and extracted palettes.
5. **Present and share after synthesis.** The thing worth showing a client is the direction and its reasons.
6. **AI images last.** They cost the most, are the hardest to make look good, and are the easiest to cut.
7. **Paid plans must be ready by phase 5.** That is where AI cost per use starts.
8. **Permissions and collaboration move to Later.** A solo designer doesn't need them.

## Decisions

- **2026-10 — The old "Whiteboard" item is now the project canvas.** A canvas lives inside a brand project, not on its own.
- **2026-10 — Fixed brand facets plus free tags,** not free tags only. Fixed facets let AI compare and group sources.
- **2026-10 — A brand project is the container for client work.** The library stays global; a project picks sources from it.
- **2026-10 — Cloud media storage: Cloudflare R2 (proposed).** Mado stores mostly images and short videos that are already compressed on the device. R2 has no fee for downloads, which matters for share links. Mux is built for streaming long videos and charges per minute, which Mado doesn't need.
- **2026-10 — Video compression stays in the browser.** It already runs there with `mediabunny`. It's free for us, keeps the free version local, and makes phase 3 uploads smaller. Compressing on a server needs `ffmpeg`, which Workers can't run.
- **2026-10 — Host the web app and the API on Cloudflare Workers (proposed).** One platform with R2, cheap for a side project. Postgres stays on a hosted service (Neon) and is reached through Hyperdrive. Confirm after the spike in [`plans/cloudflare-deploy-plan.md`](plans/cloudflare-deploy-plan.md).

- **2026-10 — Client order: backend, Chrome extension, then iOS and macOS.** All clients use `/api/v1`, so the backend must come first. Canvas and AI research run in parallel; see "Clients".
- **2026-10 — Work happens on `main` directly.** Mado has one developer, so branches add steps without adding review.
- **2026-10 — More file types, text first.** `.txt` and `.md` come first, then font, PDF and voice. See "More file types" above.
- **2026-10 — Text sources live in IndexedDB, not OPFS.** The record keeps the text, so search can read it, and the one OPFS file is the optional thumbnail. In the cloud, the text goes into Postgres and the thumbnail into R2. See `sources.spec.md`.

## Open questions

- Canvas library: React Flow, tldraw or Excalidraw. See `canvas.spec.md`.
- AI providers: Claude for vision, tagging and writing. AI images (phase 7) need a second provider.
- Can people without an account comment on a shared link, or only view it?
- How the paid plan counts AI use (credits per action, or a monthly limit).
- Is saving from the Chrome extension free? It needs an account and cloud storage, which breaks "Free is local, paid is cloud".
- Native apps: SwiftUI for iOS and macOS together, or only an iOS share extension. Sign in with Apple is required if Google sign-in is offered.
