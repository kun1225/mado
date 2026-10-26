# Settings

## Purpose

One place for app settings. Today it holds general preferences (whether collections show their folders' sources), the theme, the account (sign in, sign up, reset a password, see who you are, sign out) and your data (export all sources, import a folder).

**Depends on:** `auth`, `collections`, `export`, `import`. **Used by:** every `(app)` page, opened from the settings button next to the search bar. See `apps/web/ARCHITECTURE.md`.

## Behavior

- The settings button opens a dialog. It fills the screen on phones and is a centered card on larger screens.
- The sidebar lists the tabs: **General**, **Account** and **Data**. The settings button opens General. Switching tabs replaces the URL, so Back closes the panel instead of stepping through tabs.
- On phones the tabs show icons only, so three tabs and Sign in/out fit in one row. The header names the open tab, and each tab keeps its label for screen readers.
- The bottom of the sidebar shows **Sign out** when signed in, or **Sign in** for a guest. Sign in opens the Account tab, from any tab, and moves focus to the email field.
- **General, Theme:** a three-part switch, **Light**, **Dark** and **System**, built on `LiquidTabs` like the library tabs, above Collections. The pill slides to the choice and the chosen part shows its icon (sun, moon, screen). System is the default. A choice applies at once, with no Save button.
- **General, Collections:** the **Show sources from folders** switch (see `collections.spec.md`). It saves at once, with no Save button. Clicking the label flips it too.
- The theme is saved as `mado:theme` in `localStorage`, for this browser, not per account, so it stays the same across guest and sign-in. A missing or bad value means System. If storage is blocked, the choice still works until the page reloads. Other open tabs follow a change, and clearing storage sends them back to System.
- A small script in `<head>` sets the theme before the page paints, so a saved Dark never flashes Light. Under System the app follows the device, also while it is open.
- Images, videos and website embeds keep their own colors.
- Dark mode uses the light mode background color (a soft white) for accents and focus rings, with dark text on accent fills.
- **Account, signed in:** name and email.
- **Account, guest:** a short note that saves stay on this device, then "Sign in" and a **Continue with Google** button with the Google mark. Errors from Google show under the button. Sign in in the sidebar moves focus to this button.
- **Every sign-in flag off, guest:** no Account tab and no Sign in button. A link with `?settings=account` opens General. A signed-in user still sees the Account tab and Sign out, so turning sign-in off never hides their account.
- **Account, guest, with email turned back on:** the Google button, an "or use email" line, then the email form. The form switches between sign-in, sign-up, forgot password and reset password without leaving the panel. On a switch, the old form fades out and the new one fades in and rises a little. With reduced motion it switches at once.
- **Data, Storage:** the total the browser says this site uses, with the most it allows ("of 12.0 GB available", left out when the browser gives no limit), a bar split into Videos, Images and Other, and a row for each with its size. The bar grows in once. With reduced motion it shows at once. Videos and Images add up the files of every source, trash included, because trashed files still use space. Other is the rest: thumbnails, previews and the database. A short note under the rows says everything is saved on this device and what Other means. The section is hidden while loading, or when the browser has no `navigator.storage.estimate()`. The numbers are read again when the number of sources changes (an import, a delete, emptying the trash).
- **Data, Backup:** how many sources and collections there are, then **Export .zip** (see `export.spec.md`) and **Import folder** (see `import.spec.md`) side by side. The progress bar of the one that runs shows below the buttons. Only one of the two runs at a time. "How it works" folds the long explanation of both.
- Esc, the close button and a click outside close the panel. Closing removes every settings param from the URL and keeps the rest (for example `?source=`).
- Switching forms drops the link's `token`, `verified` and `error`, so an old status message doesn't follow you to another form.

## URL

| Param               | Values                                                    | Set by                                              |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `settings`          | `general`, `account`, `data`                              | the settings button, tabs                           |
| `auth`              | `sign-up`, `forgot-password`, `reset-password` (or empty) | the form, the reset email                           |
| `token`             | reset token                                               | better-auth, on reset links                         |
| `verified`          | `true`                                                    | the verification email                              |
| `error`             | better-auth error code                                    | better-auth, on bad links and failed Google sign-in |
| `error_description` | raw provider text (never shown, dropped on close)         | better-auth, with `error`                           |

Unknown values fall back to closed, or to the sign-in form.

## Decisions

- **2026-10 — A dialog, not a `/settings` page.** The library stays behind it, and Esc brings you back.
- **2026-10 — The open panel lives in the URL.** Email links must open it on the right form, and the same params make the panel linkable.
- **2026-10 — Sign in/out is a sidebar action, not a tab.** A tab is a place. Signing out is something you do.
- **2026-10 — No confirm step for sign-out.** Each account's data stays on this device, so signing out loses nothing.
- **2026-10 — Only tabs with real content.** Empty tabs feel broken. New tabs come with their feature.
- **2026-10 — General is the first tab and opens by default.** It holds everyday preferences, and Sign in still jumps straight to Account.
- **2026-10 — Settings shows the folder sources switch but does not own it.** The value and its rules live in `collections`, so settings still owns no data.
- **2026-10 — Hover and active are two sliding clip-path layers** (200ms ease-in-out, no bounce). Each slides to its tab on its own, so moving the mouse never hides where you are. The hover layer is lighter. The active layer is a copy of the tab list, so its dark label is revealed as the clip slides, like `LiquidTabs`. Touch gets no hover layer, so a tap can't leave it stuck.

- **2026-10 — Three theme choices, not a switch.** A switch can't say both "always dark" and "follow my device".
- **2026-10 — The theme is browser-wide, not per account.** The startup script must read it before any account loads, and one person per browser is the common case.
- **2026-10 — The startup script is a fixed string next to the store.** It runs before any bundle, so it can't import the store. A test runs it against every saved value and device theme and compares with the store, so the two can't drift.
- **2026-10 — The theme switch is `LiquidTabs`, not radios, tiles or a select.** Picked from a prototype of four. It is compact, moves like the library tabs, and shows every choice at once. Rejected: plain radios (tall, no look of the result), preview tiles (the most height, and their fixed colors drift from the palette), a select (two clicks, choices hidden).
- **2026-10 — Tabs semantics for a setting.** Screen readers hear a tab list, not radios. We accept it to reuse `LiquidTabs`; arrow keys still move between choices.
- **2026-10 — Theme lives in General, not its own tab.** One setting doesn't earn a tab, and General is where everyday preferences go.
- **2026-10 — Storage is a breakdown, not one bar against the quota.** The quota is tens of GB, so "used of quota" is a bar nobody can see. Where the bytes went is more useful, and it needs no quota.
- **2026-10 — Backup is one compact row, with the rules folded away.** Both actions stay visible and the tab stays short. Export keeps the primary button, because it is the common one.

## Known gaps

- No component tests. The web app has no `@testing-library` yet, so the dialog is checked by hand.
- Colors with transitions (buttons, tabs) fade when the theme changes, instead of switching at once.
- Embedded websites may not follow the app theme.
- The browser estimate covers the whole site, so a device with more than one account also counts the other accounts' files in Other. The estimate is also rounded on purpose, so treat it as close, not exact.
