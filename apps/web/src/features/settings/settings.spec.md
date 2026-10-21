# Settings

## Purpose

One place for app settings. Today it holds the account (sign in, sign up, reset a password, see who you are, sign out) and your data (export all sources, import a folder).

**Depends on:** `auth`, `export`, `import`. **Used by:** every `(app)` page, opened from the settings button next to the search bar. See `apps/web/ARCHITECTURE.md`.

## Behavior

- The settings button opens a dialog. It fills the screen on phones and is a centered card on larger screens.
- The sidebar lists the tabs: **Account** and **Data**. Switching tabs replaces the URL, so Back closes the panel instead of stepping through tabs.
- The bottom of the sidebar shows **Sign out** when signed in, or **Sign in** for a guest. Sign in opens the Account tab, from any tab, and moves focus to the email field.
- **Account, signed in:** name and email.
- **Account, guest:** a short note that saves stay on this device, then the auth form. The form switches between sign-in, sign-up, forgot password and reset password without leaving the panel. On a switch, the old form fades out and the new one fades in and rises a little. With reduced motion it switches at once.
- **Data, Storage:** the total the browser says this site uses, with the most it allows ("of 12.0 GB available", left out when the browser gives no limit), a bar split into Videos, Images and Other, and a row for each with its size. The bar grows in once. With reduced motion it shows at once. Videos and Images add up the files of every source, trash included, because trashed files still use space. Other is the rest: thumbnails, previews and the database. A short note under the rows says everything is saved on this device and what Other means. The section is hidden while loading, or when the browser has no `navigator.storage.estimate()`. The numbers are read again when the number of sources changes (an import, a delete, emptying the trash).
- **Data, Backup:** how many sources and collections there are, then **Export .zip** (see `export.spec.md`) and **Import folder** (see `import.spec.md`) side by side. The progress bar of the one that runs shows below the buttons. Only one of the two runs at a time. "How it works" folds the long explanation of both.
- Esc, the close button and a click outside close the panel. Closing removes every settings param from the URL and keeps the rest (for example `?source=`).
- Switching forms drops the link's `token`, `verified` and `error`, so an old status message doesn't follow you to another form.

## URL

| Param      | Values                                                    | Set by                      |
| ---------- | --------------------------------------------------------- | --------------------------- |
| `settings` | `account`, `data`                                         | the settings button, tabs   |
| `auth`     | `sign-up`, `forgot-password`, `reset-password` (or empty) | the form, the reset email   |
| `token`    | reset token                                               | better-auth, on reset links |
| `verified` | `true`                                                    | the verification email      |
| `error`    | better-auth error code                                    | better-auth, on bad links   |

Unknown values fall back to closed, or to the sign-in form.

## Decisions

- **2026-10 — A dialog, not a `/settings` page.** The library stays behind it, and Esc brings you back.
- **2026-10 — The open panel lives in the URL.** Email links must open it on the right form, and the same params make the panel linkable.
- **2026-10 — Sign in/out is a sidebar action, not a tab.** A tab is a place. Signing out is something you do.
- **2026-10 — No confirm step for sign-out.** Each account's data stays on this device, so signing out loses nothing.
- **2026-10 — Only tabs with real content.** Empty tabs feel broken. New tabs come with their feature.
- **2026-10 — Hover and active are two sliding clip-path layers** (200ms ease-in-out, no bounce). Each slides to its tab on its own, so moving the mouse never hides where you are. The hover layer is lighter. The active layer is a copy of the tab list, so its dark label is revealed as the clip slides, like `LiquidTabs`. Touch gets no hover layer, so a tap can't leave it stuck.

- **2026-10 — Storage is a breakdown, not one bar against the quota.** The quota is tens of GB, so "used of quota" is a bar nobody can see. Where the bytes went is more useful, and it needs no quota.
- **2026-10 — Backup is one compact row, with the rules folded away.** Both actions stay visible and the tab stays short. Export keeps the primary button, because it is the common one.

## Known gaps

- No component tests. The web app has no `@testing-library` yet, so the dialog is checked by hand.
- The browser estimate covers the whole site, so a device with more than one account also counts the other accounts' files in Other. The estimate is also rounded on purpose, so treat it as close, not exact.

## Planned

- **Appearance tab** with the dark mode switch (see `docs/roadmap.md`).
- **Google sign-in** in the account form (see `auth.spec.md`).
