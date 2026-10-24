# Auth

## Purpose

Signing in is optional. Guests use the app fully with data on this device. An account keeps each user's local data apart now, and is the base for cloud backup later.

**Depends on:** `storage`. **Used by:** every `(app)` page, and the `settings` panel, which hosts every auth form. See `apps/web/ARCHITECTURE.md`.

## Behavior

- Guests are never sent to sign-in. There are no auth pages. Sign-in lives in the settings panel (see `settings.spec.md`).
- **Google is the only way in.** "Continue with Google" → choose a Google account → back to the same page, signed in. A first-time user gets a Mado account in the same step. The button says "Connecting…" and ignores more clicks until the browser leaves. If Back restores the page, the button works again.
- A verified email user who signs in with Google using the same email keeps the same user ID and local library.
- If Google sign-in fails or is canceled, the same page reopens the account panel with fixed copy: "Google sign-in was canceled", "This email already has an unfinished Mado account. Contact support." (an unverified email user), or a generic retry message. Raw provider text is never shown.
- Signing in with Google does not move guest saves into the account.
- **Email and password (paused, off by default).** With the switch on: sign up → a verification email → its link opens the panel with "Your email is verified" → sign in. Signing in before verifying offers to resend the link, at most once a minute. Forgot password → a reset link → the link opens the panel on "Choose a new password" → the form switches to sign-in. With it off, the API rejects email sign-in and sign-up, and the reset and verification routes return 404, so nothing can send an email.
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
- **2026-10 — Email and password sign-up and sign-in are paused.** Google is the only way in. The email code stays, behind the `authEmailPassword` flag (off by default), so it can come back without a rewrite. See `docs/plans/google-sign-in-plan.md`.
- **2026-10 — With email off, the reset and verification routes go in `disabledPaths`.** Better Auth's `emailAndPassword.enabled` blocks only sign-in and sign-up, and the other routes could still be used to send emails to anyone.
- **2026-10 — Google links to an existing user only when both emails are verified and match.** Otherwise someone could sign up with another person's email first and take over their account later. Different-email linking and trusted providers stay off.
- **2026-10 — Google uses a full-page redirect, not a popup.** The return is a fresh page load, so the right account storage is picked before any library data shows.
- **2026-10 — Google errors show fixed copy keyed by the error code.** The code arrives in the URL, so anyone can edit it.
- **2026-10 — Google sign-in has its own flag, `authGoogle` (on by default).** With it off, the API registers no Google provider and needs no Google credentials, so a hidden button is not the only gate. If every sign-in flag is off, settings hides the Account tab from guests and the app stays in guest mode.
- **2026-10 — In development, the app runs as a guest by default** (`VITE_DEV_AUTH_BYPASS`), so it works without the auth API. Set it to `false` to test real login. It can never be on in production.

## Known gaps

- There's no way yet to move guest data into an account after signing up.
- An unverified email user can't get in while email is paused. Neither can an email user whose Google account uses another email. Mado has no real users yet, so no one is locked out.
- Verify and reset links sent before the switch return 404. They expire within an hour.
- A bad or lost OAuth state returns to `/library`, not the page the user started on.
- No component tests for the Google button. It is checked by hand.
