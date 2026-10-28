# Landing

## Purpose

The page at `/`. It tells the story from the roadmap, lets you try the real library, and sends you into the app.

**Depends on:** `sources` and `collections` (through `LibraryView` and the add button), `auth` (the `(app)` session check). **Used by:** nothing. See `apps/web/ARCHITECTURE.md`.

## Behavior

One column of sections with `px-edge` side padding. The gallery and the line background run full width. The header is sticky.

1. **Hero.** "Frame what _you see_.", one line about Mado, an "Open Mado" button, and a wall of references in 2, 3 or 4 columns (phone, `sm`, `lg`). Each column drifts up or down forever, at its own speed and from its own first item. The top and bottom edges fade. It never pauses on hover, and stands still with reduced motion.
2. **What works today.** Three items: stays on your device, no sign-up, drop and sort. Each has a shape: the logo frame, an arched window (窓), a folder.
   - `md` and up: the title and a short line, then three cards at staggered heights. Each card drifts at its own speed as you scroll (off with reduced motion). Hovering a card with a mouse draws a thin frame around it, 8px outside, and fills the section with five thin rings of its shape, drawn from the middle out.
   - Phones: the section pins for three screens of scrolling. Each third makes the next item active (dark card), and its rings fill the section.
3. **Try it.** "Try it _here_." and a frame holding the real library, the same as `/library`. The frame does not scroll, so the wheel always scrolls the page. The bottom fades, and "Open full library" shows the rest. If the library is empty the first time, three collections (Typography, Pattern, Brand) are added, each with three public domain images as real sources. Each links to its Wikimedia Commons page.
4. **What comes next.** The roadmap as cards you scroll sideways (trackpad, shift+wheel, touch). The edges fade only where there is more to see (`ScrollFade`: scroll-driven CSS, or scroll events in Firefox).
5. **Call to action.** The logo, "Your library is _one click_ away.", and "Open Mado".

### Intro

- First visit in a tab session: "Mado" and "窓" appear with a gap. A pill-shaped window opens in the gap, grows into the full gallery, then the hero text and header come in.
- Plays once per session (`sessionStorage`). Never plays with reduced motion or blocked storage.
- While it plays, the page starts at the top and cannot scroll. The pill opens in the middle of the visible part of the wall, since the wall is taller than the screen.
- A small inline script sets the first frame before paint, so the end state never flashes.

### Reveal

- Text comes in word by word: each word slides up, fades in and sharpens. Other elements do the same as one block. Each plays once, when it scrolls into view.
- Reduced motion shows everything at once.

## Decisions

- **2026-10 — Built from the `/proto/landing` exploration.** Kept: the calm gallery wall, "built is sharp, the rest is coming" in the copy, and a library you can try.
  - Rejected: frosted glass and blur. It looked soft and cost speed on phones.
  - Rejected: the logo frame as a border on cards. It stays in the logo and line drawings.
  - Rejected: a "Mado in short" section, eyebrow labels and a "How it works" grid. They added words; the real library shows the same thing.
- **2026-10 — The "try it" frame is the real library.** The page lives under `(app)`, so it shares the account and local data with `/library`. Why: a fake demo can drift from the app, and the real one proves "local, no sign-up". Cost: the page needs the session check.
- **2026-10 — The frame doesn't scroll, and samples fill an empty library.** A scrolling box caught the wheel and stopped the page. An empty frame didn't show what Mado is. Samples are real sources you can open, sort and delete. They are added once per browser (`localStorage`). They are public domain, so they need no credit, and load from Wikimedia's thumbnail host, which allows cross-origin fetch (`commons.wikimedia.org` redirects don't).
- **2026-10 — Reveal runs in CSS.** One shared `IntersectionObserver` sets `data-revealed`, and each word's delay comes from its order. Why: a motion value and scroll listener per word cost main-thread time on every scroll.
- **2026-10 — Scroll-linked motion is allowed here.** A marketing page is seen once, so it gets more motion than the app. Motion still follows input where it can.
- **2026-10 — The gallery doesn't pause on hover.** It is a backdrop, not something to read, so stopping it added nothing.
- **2026-10 — "Today" is cards on wide screens, a pinned list on phones.** Three screens of pinned scroll felt long on desktop. Phones have no hover, so they keep the list. Both use five rings, not eight, to stay quiet.
  - Rejected: a pinned line drawing beside the text. It looked busy.
- **2026-10 — The "today" card hover is a frame that draws itself** (picked from `/proto/today-hover`). 1px, 8px outside the card, radius 20px (12px card plus the gap), draws in 900ms ease-in-out, fades out in 250ms. Why: it uses the same lines as the rings and the logo. Mouse only, so a tap never leaves a card stuck.
  - Rejected: the card turning dark. Too loud; it pulled the eye off the rings.
  - Rejected: lifting the card with a shadow. Generic, and a second movement on top of the parallax.
  - Rejected: fading the other cards. They looked disabled.
  - Rejected: no change on the card. It felt dead under the mouse.
- **2026-10 — The roadmap scrolls sideways natively.** It replaced a pinned section that turned vertical scroll into sideways motion. Native scroll works the same everywhere.
  - Rejected: a rolling step title for "Try it". It moved without saying more.
- **2026-10 — The serif accent is Cormorant Garamond italic, weight 600** (`font-accent`), loaded only on this page. At most two serif words per title. Picked over Bodoni Moda (the first choice), Instrument Serif, Playfair Display, Fraunces, DM Serif Display, Newsreader and EB Garamond.

## Known gaps

- Four gallery photos are CC BY or CC BY-SA and need credit, but the footer credit was removed. Before launch, swap them for screenshots of a real Mado library (or public domain images) hosted with the app.
- No Open Graph image yet (see `docs/plans/landing-page-v1.md`).
- Pasting anywhere on the page adds to the library, because the add button listens for paste on the whole document, as on `/library`.
