# Landing page v1

The first landing page for the launch. It tells the brand-tool story from the [roadmap](../roadmap.md) and sends people straight into the library that works today.

**Decision (2026-10):** v1 is small. Six sections, no waitlist. Mado is free in this stage and needs no account, so the call to action opens the app. Why: a waitlist means a backend and a reason to wait. Today there is nothing to wait for.

**Built (2026-10):** the page is live at `/`. What it does now, and why it changed from the table below (no "Mado in short", the real library instead of a "How it works" grid), is in [`landing.spec.md`](../../apps/web/src/features/landing/landing.spec.md).

## Sections

| #   | Section          | What it says                                                                                                                           |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero             | The tagline, one sentence about Mado, an "Open Mado" button, and a short loop of the real library.                                     |
| 2   | Mado in short    | A simple guide to what Mado is: a window (窓) for brand designers. Collect what you see, then frame it into a direction.               |
| 3   | What works today | Local first: your files stay on your device. No sign-up and no login. Simple and direct: drop images, videos and sites, and sort them. |
| 4   | How it works     | Collect → Make sense → Directions → Present. Mark which steps work today and which are coming.                                         |
| 5   | What's coming    | Facets, brand projects and the canvas, then AI that shows its sources. Pulled from the roadmap phases.                                 |
| 6   | Call to action   | "Open Mado". A waitlist may come later, when there is a paid cloud plan to wait for.                                                   |

## Assets needed

- Logo: mark, wordmark, lockup, favicon
- Brand colors and type, added next to the `--poise-*` tokens
- 3–5 screenshots or short loops of the library, light and dark
- An Open Graph image (1200×630)
- Hero motion (Remotion, `apps/motion`)
- Copy for each section

## Later

- A waitlist for the paid cloud plan (phase 3)
- Pricing, once paid plans exist (needed by phase 5)
