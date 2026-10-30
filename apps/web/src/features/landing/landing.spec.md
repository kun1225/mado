# Landing

## Purpose

The page at `/`. It shows what Mado is through scrolling, answers the first questions, and sends you into the app.

**Depends on:** no domain. The library on the page is a picture built from static files in `public/landing`. It lives under `(app)`, which adds the session check. See `apps/web/ARCHITECTURE.md`.

## Behavior

One column of sections with `px-edge` side padding. All copy and card data live in `landing-content.ts`.

**Header.** Sticky, 64px, made of two floating 40px blocks with no shadow. On the left, the logo and four section links (Features, Search, FAQ, Roadmap) on a frosted panel with a border; the panel gets more solid once the hero ends. On the right, "Open Mado" with an arrow in a small square. Every call to action on the page uses this same button (`OpenMado`). The link for the section that crosses 40% of the screen gets a box that slides between links as you scroll; between those sections no link is marked. Phones show only the logo and the button. The bar between the blocks takes no clicks.

1. **Hero and gallery** (one section, three screens tall, the stage sticks). About twenty saved sources float and bob behind "Your _local_ design library.", one line about Mado, and "Try Mado". The floats drift a little against the mouse, bigger ones more; the drift fades out as the grid forms. Not on touch or with reduced motion. As you scroll, the title fades, each source moves from its float point into its slot in a library grid, and the window bar and collections row fade in. The collections row starts with a "New collection" card, like `/library`. The result looks like `/library` in a frame, but nothing in it can be clicked.
2. **Pain point, then features**, on one sticky stage (four and a half screens).
   - **Pain point.** One big line, "Saving ideas is easy. _Finding_ them again isn't.", reveals word by word as you scroll: each word fades in, rises 12px and sharpens from a 6px blur. The word ranges overlap, finish before the crossfade, and reverse when scrolling back. The sentence holds in the middle, with its serif accent and normal word wrapping preserved. Reduced motion keeps the word fades without blur or movement.
   - **Crossfade.** In the same spot, the pain line fades out and slides up 24px while the features fade in and slide up the same 24px. The first demo starts as the fade starts.
   - **Features.** The title across the top (half the width on desktop). Under it, three numbered steps (number, title, line) on the left and a demo for the active step on the right, as tall as the steps. Each third of the remaining scroll makes the next step active and fills a line under it. Only the active step shows its line; it opens and fades in as the step turns active. Demos: four kinds of saves drop in (image, video, website, note); four cards fly into two collections and their counts go up; a zip goes out of a computer and back in. A demo replays each time its step turns active. Phones put the demo on top.
3. **Find anything.** The stage pins for two screens of scroll. The scroll types three queries into a search box, by name, by collection, and by description (marked "Soon"): each query owns a third, typed in its first half and held in the second. Three bars under the box fill with the scroll. Cards that don't match dim. On wide screens the demo's width follows the screen height, so the stage fits.
4. **No account.** "No sign-up. No login. _Just start._" and "Open Mado".
5. **FAQ.** A `MorphAccordion` from `@repo/ui`: one card that splits around the open question, one open at a time. The closed questions shrink a little, dim and blur, so the open one comes forward. Questions: free, where files live, more than one device, what you can save, clearing browser data, accounts.
6. **Roadmap.** Cards you scroll sideways. The edges fade only where there is more to see (`ScrollFade`).
7. **Call to action.** The logo with "Mado" beside it, like the header, then "Start your library _today_.", and "Open Mado".
8. **Footer.** Wordmark, links to the library, roadmap and FAQ, and a copyright line.

### Off screen

- The hero, features and search sections each watch themselves with one observer. Off screen, their videos and CSS loops pause, and the looping local demo unmounts.

### Intro

- First visit in a tab session: "Mado" appears in the middle of an empty screen. It splits into "Ma" and "do", and a rounded rectangular window (up to 280px wide, 144px tall, 16px corners) opens between them onto an overlapping cluster of sources. The window grows to the full screen, the clustered sources spread to their existing float points, then the hero text and header come in. The title's veil stays off until then, so it doesn't wash out the cluster.
- Plays once per session (`sessionStorage`). Never plays with reduced motion or blocked storage.
- While it plays, the page starts at the top and cannot scroll. The page keeps room for the scrollbar the whole time (`scrollbar-gutter: stable`), so it doesn't jump sideways when scrolling comes back.
- A small inline script sets the first frame before paint, so the end state never flashes.

### Reveal

- Text comes in word by word: each word slides up, fades in and sharpens. Other elements do the same as one block. Each plays every time it scrolls into view from the bottom.

### Reduced motion

- No intro, no bobbing. The gallery is already built, and the hero title sits on a veil that fades as you scroll. Fades still follow the scroll; movement doesn't (`MotionConfig reducedMotion="user"`).
- Videos don't autoplay. The search demo shows each query whole, with no typing.

## Decisions

- **2026-10 — v2 replaced the first page.** v1 had a drifting wall, a "what works today" section and a usable library in a frame. v2 tells one story by scrolling: scattered sources become one library.
- **2026-10 — The gallery is a picture of the library, not the real one.** The real cards read IndexedDB and OPFS, and the floating move needs cards that can go anywhere. A copy built from the same tokens is simpler. Cost: it can drift from the app's look, so check it when the library's cards change. The collections row draws its folders with the app's `CollectionPocket` and its new card with `CollectionNewCard`, so those can't drift; the row is `inert` so the button takes no focus.
  - This removed the sample seeding, the Wikimedia images, and the bug where pasting on the page added a source.
- **2026-10 — Sources come from a real Mado library, shrunk into `public/landing`** (images 720px wide WebP; videos 640px, 8 seconds, no sound). The whole folder is about 630 KB.
- **2026-10 — One section for hero and gallery.** The floating cards and the grid cards are the same elements. Each slot is measured on an untransformed wrapper, and `tilePose` moves the card between its float point and its slot. Why: a hand-off between two sections would jump.
- **2026-10 — Pain point and features share one sticky stage.** They crossfade in place, so the problem turns into the answer as one scene. Two stages scrolled one away and the next one in, which broke the story.
- **2026-10 — The gallery grid is flex columns filled by `splitIntoColumns`, not CSS `columns`.** Safari didn't paint most of the moving tiles inside a multi-column box. Each tile goes to the shortest column, so the order runs across the top row first.
- **2026-10 — Scroll-linked opacity uses function transforms.** Motion's built-in scroll-timeline shortcut for `useTransform(progress, [range], [range])` on opacity mapped the range wrong (it faded back out after the end). A function transform (`transform(...)`) avoids that shortcut.
- **2026-10 — Search by description is shown, marked "Soon".** It is on the roadmap (phase 4), and the label keeps the page honest.
- **2026-10 — Scroll-linked motion is allowed here.** A marketing page is seen once, so it gets more motion than the app. Motion still follows input where it can.
- **2026-10 — The serif accent is Cormorant Garamond italic, weight 600** (`font-accent`), loaded only on this page. At most two serif words per title. The page preconnects to Google Fonts, because the first title uses it and a late swap moves the text.
- **2026-10 — Hero tiles load eager, the rest lazy.** Every hero tile floats on the first screen, even when its grid slot starts below it, so lazy loading showed empty boxes.
- **2026-10 — `--bob` is set on each bob element, not on the hero band.** A CSS variable change restyles every element under it. On the band that was 230 elements each scroll frame; style recalc in the first part of the hero scroll fell about 45% after the move.
- **2026-10 — Pausing off screen is one observer per section, not per media element.** Fewer observers, and one boolean pauses videos, CSS loops and the looping demo together.
- **2026-10 — The header is two floating blocks with section links, picked from a prototype.** Compared at full size on the real page: the old clear-to-solid bar, a centered pill (Island), a bar that hides on scroll down (Retreat), an editorial bar with a text-link CTA (Masthead), and a section tracker (Chapters). The pick mixes Island and Chapters, with Mado's square-ish corners (12px outside, 8px inside), 40px tall, no shadow, and the CTA in `t-l-2`.
  - Rejected: the old bar gave no way to jump to a section. Retreat hid the CTA while you read. Masthead covered the top of the hero and made the CTA weak. A round pill didn't look like Mado's square cards.
  - The active link comes from `pickActiveSection` over the sections' ids, so each linked section needs its id (`features`, `search`, `faq`, `roadmap`).

- **2026-10 — The search demo follows the scroll, not a timer.** The reader sets the pace, and a query holds until they scroll on. The timer kept typing while you read and you missed queries.
- **2026-10 — One button style on the page.** The header's "Open Mado" (accent, arrow in a square) is used for every call to action, so the page asks for one thing in one way.
- **2026-10 — The intro cluster and the floats are one motion value (`spread`).** The tiles are the same elements in the cluster, the floats and the grid, so nothing is handed off. `introClusterFloat` and `mixFloat` give the start pose that `tilePose` already moves into the grid.

- **2026-10 — Cluster chosen from `/proto/intro`.** Sources overlap in a compact, irregular collage before spreading to the existing hero positions. The opening is 144px tall with 16px corners, replacing the 64px pill so more of the collage shows. It holds briefly before spreading. Rejected: the straight row felt boring; Fan was wide, Stack hid too much, and Ribbon still felt like a horizontal strip. The hero float positions stay the same.

## Known gaps

- The gallery shows screenshots of other studios' websites and work from a real library. Check that this is fine before launch, or swap in sources we can show.
- No Open Graph image yet (see `docs/plans/landing-page-v1.md`).
- The route still sits under `(app)` and runs the session check, which it no longer needs.
