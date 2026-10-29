# Landing

## Purpose

The page at `/`. It shows what Mado is through scrolling, answers the first questions, and sends you into the app.

**Depends on:** no domain. The library on the page is a picture built from static files in `public/landing`. It lives under `(app)`, which adds the session check. See `apps/web/ARCHITECTURE.md`.

## Behavior

One column of sections with `px-edge` side padding. The header is sticky. All copy and card data live in `landing-content.ts`.

1. **Hero and gallery** (one section, three screens tall, the stage sticks). About twenty saved sources float and bob behind "Your _local_ design library.", one line about Mado, and "Try Mado". As you scroll, the title fades, each source moves from its float point into its slot in a library grid, and the window bar and collections row fade in. The collections row starts with a "New collection" card, like `/library`. The result looks like `/library` in a frame, but nothing in it can be clicked.
2. **Pain point, then features**, on one sticky stage (four and a half screens).
   - **Pain point.** One big line, "Saving ideas is easy. _Finding_ them again isn't.", fades in as the stage comes up and holds in the middle.
   - **Crossfade.** In the same spot, the pain line fades out while the features fade in and slide up a little (24px). The pain line doesn't move; the first demo starts as the fade starts.
   - **Features.** The title across the top (half the width on desktop). Under it, three numbered steps (icon, title, line) on the left and a demo for the active step on the right, as tall as the steps. Each third of the remaining scroll makes the next step active and fills a line under it. Demos: four kinds of saves drop in (image, video, website, note); four cards fly into two collections and their counts go up; a zip goes out of a computer and back in. A demo replays each time its step turns active. Phones put the demo on top and show only the active step's line.
3. **Find anything.** A search box types three queries, by name, by collection, and by description (marked "Soon"). Cards that don't match dim. Runs only while on screen.
4. **No account.** "No sign-up. No login. _Just start._" and "Open Mado".
5. **FAQ.** A `MorphAccordion` from `@repo/ui`: one card that splits around the open question, one open at a time. The closed questions shrink a little, dim and blur, so the open one comes forward. Questions: free, where files live, more than one device, what you can save, clearing browser data, accounts.
6. **Roadmap.** Cards you scroll sideways. The edges fade only where there is more to see (`ScrollFade`).
7. **Call to action.** The logo, "Start your library _today_.", and "Open Mado".
8. **Footer.** Wordmark, links to the library, roadmap and FAQ, and a copyright line.

### Off screen

- The hero, features and search sections each watch themselves with one observer. Off screen, their videos and CSS loops pause, and the looping local demo unmounts.

### Intro

- First visit in a tab session: "Mado" appears in the middle of an empty screen. It splits into "Ma" and "do", and a pill-shaped window opens between them onto the hero. The window grows to the full screen, then the hero text and header come in.
- Plays once per session (`sessionStorage`). Never plays with reduced motion or blocked storage.
- While it plays, the page starts at the top and cannot scroll.
- A small inline script sets the first frame before paint, so the end state never flashes.

### Reveal

- Text comes in word by word: each word slides up, fades in and sharpens. Other elements do the same as one block. Each plays every time it scrolls into view from the bottom.

### Reduced motion

- No intro, no bobbing. The gallery is already built, and the hero title sits on a veil that fades as you scroll. Fades still follow the scroll; movement doesn't (`MotionConfig reducedMotion="user"`).
- Videos don't autoplay. The search demo shows its first query and stops.

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

## Known gaps

- The gallery shows screenshots of other studios' websites and work from a real library. Check that this is fine before launch, or swap in sources we can show.
- No Open Graph image yet (see `docs/plans/landing-page-v1.md`).
- The route still sits under `(app)` and runs the session check, which it no longer needs.
