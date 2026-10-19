# Settings

## Purpose

One place for app settings. Today it holds the account (sign in, sign up, reset a password, see who you are, sign out) and your data (export all sources).

**Depends on:** `auth`, `export`. **Used by:** every `(app)` page, opened from the settings button next to the search bar. See `apps/web/ARCHITECTURE.md`.

## Behavior

- The settings button opens a dialog. It fills the screen on phones and is a centered card on larger screens.
- The sidebar lists the tabs: **Account** and **Data**. Switching tabs replaces the URL, so Back closes the panel instead of stepping through tabs.
- The bottom of the sidebar shows **Sign out** when signed in, or **Sign in** for a guest. Sign in opens the Account tab, from any tab, and moves focus to the email field.
- **Account, signed in:** name and email.
- **Account, guest:** a short note that saves stay on this device, then the auth form. The form switches between sign-in, sign-up, forgot password and reset password without leaving the panel.
- **Data:** how many sources and collections there are, and **Export** (see `export.spec.md`).
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

## Known gaps

- No component tests. The web app has no `@testing-library` yet, so the dialog is checked by hand.

## Planned

- **Appearance tab** with the dark mode switch (see `docs/roadmap.md`).
- **Data tab:** storage used, import a folder.
- **Google sign-in** in the account form (see `auth.spec.md`).
