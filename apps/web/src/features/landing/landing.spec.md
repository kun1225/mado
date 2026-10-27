# Landing

## Purpose

The page at `/`. It tells the brand-tool story from the roadmap, lets you try the real library in place, and sends you into the app.

**Depends on:** `sources` and `collections` (through `LibraryView` and the add button in the "try it" frame), `auth` (the `(app)` session check). **Used by:** nothing. See `apps/web/ARCHITECTURE.md`.

## Behavior

The page is one column of sections, each with `px-edge` side padding except the gallery, which runs full width. The header is sticky.

1. **Hero.** "Frame what _you see_.", one line about Mado, an "Open Mado" button, then a full-width strip of references that drifts sideways forever. It pauses on hover and stands still with reduced motion (you can scroll it sideways instead).
2. **What works today.** Three items: stays on your device, no sign-up, drop and sort. On wide screens a line drawing stays pinned beside the text, and it redraws for the item in the middle of the screen. Other items fade back. On phones each drawing sits above its own text and stays drawn once reached.
3. **Try it.** The four steps (Collect, Make sense, Shape directions, Present) roll by one at a time as the title, each marked "Works today" or "Coming". Screen readers get one heading with all four. Below is a frame holding the real library: the same collections row, grid, drop zone and add button as `/library`.
4. **What comes next.** The roadmap as cards. On screens 1024px and wider the section pins, and scrolling down slides the cards sideways, 1:1 with scrolling, with a progress line. Below that width the cards stack.
5. **Call to action.** The logo, "Your library is _one click_ away.", and "Open Mado".

### Intro

- On the first visit in a tab session: "Mado" and "窓" appear with a gap between them. A pill-shaped window opens in the gap and shows the gallery. It grows into the full gallery strip, then the hero text and the header come in.
- It plays once per session (`sessionStorage`). It never plays with reduced motion, or when storage is blocked.
- A small script in the page sets the first frame before paint, so the end state never flashes first.

### Reveal

- Titles and text come in word by word: each word slides up, fades in and sharpens. Other elements do the same as one block. Each plays once, when it scrolls into view.
- Reduced motion shows everything at once.

## Decisions

- **2026-10 — Built from the `/proto/landing` exploration.** Picked parts: the calm gallery-wall base, the "fog to focus" idea (kept only as "built is sharp, the rest is coming" in the copy), and a library you can try on the page.
  - Rejected: frosted glass and blur surfaces. They looked soft, and many blur layers cost speed on phones.
  - Rejected: the logo's hairline-to-heavy frame as a border on cards and sections. It is the logo's own shape, so it stays in the logo and the line drawings.
  - Rejected: a "Mado in short" section and eyebrow labels ("No. 01 — …"). They added words without adding meaning.
  - Rejected: a separate "How it works" grid. The rolling step title over the real library says the same thing and lets you try it.
- **2026-10 — The "try it" frame is the real library.** The page lives under `(app)`, so it uses the same account and local data as `/library`. What you add on the landing page is there when you open Mado. Why: a fake demo can drift from the real app, and the real one proves "local, no sign-up" better than words. Cost: the page needs the session check like every `(app)` page.
- **2026-10 — Reveal runs in CSS, not a motion value per word.** One shared `IntersectionObserver` sets `data-revealed` once, and each word's transition is delayed by its order. Why: hundreds of motion values and scroll listeners cost main-thread time on every scroll.
- **2026-10 — Scroll-linked motion is allowed here.** A marketing page is seen once, so it gets a bigger motion budget than the app. Motion still follows input where it can (the pinned roadmap is 1:1 with scrolling).
- **2026-10 — The serif accent is Bodoni Moda at weight 600** (`font-accent`), loaded only on this page. Never more than two serif words in a title.

## Known gaps

- The gallery photos are open-licensed Wikimedia images loaded from Wikimedia. Swap them for screenshots of a real Mado library, hosted with the app, before launch.
- No Open Graph image yet (see `docs/plans/landing-page-v1.md`).
- Pasting anywhere on the page adds to the library, because the frame's add button listens for paste on the whole document, as it does on `/library`.
