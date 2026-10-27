# Landing

## Purpose

The page at `/`. It tells the brand-tool story from the roadmap, lets you try the real library in place, and sends you into the app.

**Depends on:** `sources` and `collections` (through `LibraryView` and the add button in the "try it" frame), `auth` (the `(app)` session check). **Used by:** nothing. See `apps/web/ARCHITECTURE.md`.

## Behavior

The page is one column of sections, each with `px-edge` side padding except the gallery and the line background, which run full width. The header is sticky.

1. **Hero.** "Frame what _you see_.", one line about Mado, an "Open Mado" button, then a wall of references in 2, 3 or 4 columns (phone, `sm`, `lg`). Each column drifts up or down forever, at its own speed and from its own first item. The top and bottom edges fade. It pauses on hover and stands still with reduced motion.
2. **What works today.** The section pins for three screens of scrolling. In the middle: the title and three items (stays on your device, no sign-up, drop and sort). Each third of the scroll makes the next item active (dark card). Behind them, thin rings of the active item's shape fill the section: the logo frame, an arched window (窓), a folder. A new shape draws from the middle out; the old one fades.
3. **Try it.** The title "Try it _here_." and a frame holding the real library: the same collections row, grid, drop zone and add button as `/library`. The frame does not scroll, so the wheel always scrolls the page; the bottom fades out and "Open full library" shows the rest. The first time the library is empty, three collections (Typography, Pattern, Brand) are created and filled with three public domain images each, as real sources. Each source links to its Wikimedia Commons page.
4. **What comes next.** The roadmap as a row of cards you scroll sideways (trackpad, shift+wheel, touch). The edges fade only where there is more to see (`ScrollFade`; scroll-driven CSS where supported, scroll events in Firefox).
5. **Call to action.** The logo, "Your library is _one click_ away.", and "Open Mado".

### Intro

- On the first visit in a tab session: "Mado" and "窓" appear with a gap between them. A pill-shaped window opens in the gap and shows the gallery. It grows into the full gallery strip, then the hero text and the header come in.
- It plays once per session (`sessionStorage`). It never plays with reduced motion, or when storage is blocked.
- While it plays the page cannot scroll, and it starts from the top. The pill opens in the middle of the part of the wall you can see, because the wall is taller than the screen.
- A small script in the page sets the first frame before paint, so the end state never flashes first.

### Reveal

- Titles and text come in word by word: each word slides up, fades in and sharpens. Other elements do the same as one block. Each plays once, when it scrolls into view.
- Reduced motion shows everything at once.

## Decisions

- **2026-10 — Built from the `/proto/landing` exploration.** Picked parts: the calm gallery-wall base, the "fog to focus" idea (kept only as "built is sharp, the rest is coming" in the copy), and a library you can try on the page.
  - Rejected: frosted glass and blur surfaces. They looked soft, and many blur layers cost speed on phones.
  - Rejected: the logo's hairline-to-heavy frame as a border on cards and sections. It is the logo's own shape, so it stays in the logo and the line drawings.
  - Rejected: a "Mado in short" section and eyebrow labels ("No. 01 — …"). They added words without adding meaning.
  - Rejected: a separate "How it works" grid. The real library says the same thing and lets you try it.
- **2026-10 — The "try it" frame is the real library.** The page lives under `(app)`, so it uses the same account and local data as `/library`. What you add on the landing page is there when you open Mado. Why: a fake demo can drift from the real app, and the real one proves "local, no sign-up" better than words. Cost: the page needs the session check like every `(app)` page.
- **2026-10 — Reveal runs in CSS, not a motion value per word.** One shared `IntersectionObserver` sets `data-revealed` once, and each word's transition is delayed by its order. Why: hundreds of motion values and scroll listeners cost main-thread time on every scroll.
- **2026-10 — Scroll-linked motion is allowed here.** A marketing page is seen once, so it gets a bigger motion budget than the app. Motion still follows input where it can (the pinned "today" section moves one item per third of its scroll).
- **2026-10 — The "try it" frame doesn't scroll, and samples fill an empty library.** A scrolling box inside the page caught the wheel and stopped the page. An empty frame didn't show what Mado is. The samples are real sources, so people can open, sort and delete them; they are added once per browser (`localStorage`), never again after you delete them. They are public domain, so they need no credit, and they load from Wikimedia's thumbnail host, which allows cross-origin fetch (`commons.wikimedia.org` redirects don't).
- **2026-10 — The roadmap scrolls sideways natively.** It replaced a pinned section that turned vertical scrolling into sideways motion. Native scrolling works the same on every screen and with every input.
  - Rejected: a rolling step title for "Try it". It moved without saying more than a plain title.
  - Rejected: a pinned line drawing beside the "today" text. The drawings looked busy; thin rings across the whole section are calmer.
- **2026-10 — The serif accent is Bodoni Moda at weight 600** (`font-accent`), loaded only on this page. Never more than two serif words in a title. Compared in the page against Instrument Serif, Playfair Display, Cormorant Garamond, Fraunces, DM Serif Display, Newsreader and EB Garamond, and kept.

## Known gaps

- The gallery photos are open-licensed Wikimedia images loaded from Wikimedia. Four are CC BY or CC BY-SA and need credit on the page, but the footer credit was removed. Swap them for screenshots of a real Mado library (or public domain images), hosted with the app, before launch.
- No Open Graph image yet (see `docs/plans/landing-page-v1.md`).
- Pasting anywhere on the page adds to the library, because the frame's add button listens for paste on the whole document, as it does on `/library`.
