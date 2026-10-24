# Auth

## Purpose

Signing in is optional. Guests use the app fully with data on this device. An account keeps each user's local data apart now, and is the base for cloud backup later.

**Depends on:** `storage`. **Used by:** every `(app)` page, and the `settings` panel, which hosts every auth form. See `apps/web/ARCHITECTURE.md`.

## Behavior

- Guests are never sent to sign-in. There are no auth pages. Sign-in, sign-up and password reset live in the settings panel (see `settings.spec.md`).
- Sign up → a verification email → its link opens the panel with "Your email is verified" → sign in. Signing in before verifying offers to resend the link, at most once a minute.
- Forgot password → a reset link → the link opens the panel on "Choose a new password" → the form switches to sign-in.
- After sign-in, the current page fully reloads without the settings params, but only if it's a safe `/library…` or `/collection…` path. Otherwise it goes to `/library`.
- A 429 reply shows "Too many tries. Please wait a minute."
- Sign-out clears the query cache and fully reloads to `/library`, which shows the guest library.
- If the account changes in any other way (for example in another tab), the page fully reloads to `/library`.

## Decisions

- **2026-10 — Auth is optional, and guests keep local data.** The product is local-first.
- **2026-10 — Sign-up and password reset reply the same way whether or not the email exists**, so the forms can't reveal who has an account.
- **2026-10 — `safeReturnTo` allows only app paths** and rejects `//`, `\`, control characters and paths that climb out with `..`. This blocks open redirects.
- **2026-10 — An account change forces a full reload**, so pending local writes can't land in the wrong account's database.
- **2026-10 — The session is checked on the server** with `Cache-Control: private, no-store`, so a shared cache never serves one user's session to another.
- **2026-10 — Auth forms live in the settings panel, not on their own pages.** Signing in is optional, so it should not take the user away from their library.
- **2026-10 — Email links point at `/library?settings=account&…`.** These params must stay stable, because links in old emails still use them. Links from before this change (`/verify-email`, `/reset-password`) now 404. They expired within an hour anyway.
- **2026-10 — Email and password sign-up and sign-in are paused.** Google becomes the only way in. The email code stays, behind a switch that is off by default (`AUTH_EMAIL_PASSWORD_ENABLED` in the API, `VITE_AUTH_EMAIL_PASSWORD_ENABLED` in the web app), so it can come back without a rewrite. Until Google sign-in ships, the email forms still work. See `docs/plans/google-sign-in-plan.md`.
- **2026-10 — In development, the app runs as a guest by default** (`VITE_DEV_AUTH_BYPASS`), so it works without the auth API. Set it to `false` to test real login. It can never be on in production.

## Known gaps

- There's no way yet to move guest data into an account after signing up.

## Planned

- **Google sign-in as the only way in.** The panel shows one "Continue with Google" button and no email fields. A verified email user who signs in with Google using the same email keeps the same account and local library. With the switch off, the email reset and verification routes return 404, so they can't send emails. Plan: `docs/plans/google-sign-in-plan.md`.
- **Known gaps after it ships:** an unverified email user can't get in, and an email user whose Google account uses another email can't get in. Mado has no real users yet, so no one is locked out.
