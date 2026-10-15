# Auth

## Purpose

Signing in is optional. Guests use the app fully with data on this device. An account keeps each user's local data apart now, and is the base for cloud backup later.

## Behavior

- Guests are never sent to sign-in.
- Sign up → a verification email → verify → sign in. Signing in before verifying offers to resend the link, at most once a minute.
- Forgot password → a reset link → set a new password → go to sign-in.
- After sign-in, the user goes back to `returnTo`, but only if it's a safe `/library…` or `/collection…` path. Otherwise they go to `/library`.
- A 429 reply shows "Too many tries. Please wait a minute."
- Sign-out clears the query cache and fully reloads to `/sign-in`.
- If the account changes in any other way (for example in another tab), the next page load fully reloads.

## Decisions

- **2026-10 — Auth is optional, and guests keep local data.** The product is local-first.
- **2026-10 — Sign-up and password reset reply the same way whether or not the email exists**, so the forms can't reveal who has an account.
- **2026-10 — `safeReturnTo` allows only app paths** and rejects `//`, `\`, control characters and paths that climb out with `..`. This blocks open redirects.
- **2026-10 — An account change forces a full reload**, so pending local writes can't land in the wrong account's database.
- **2026-10 — The session is checked on the server** with `Cache-Control: private, no-store`, so a shared cache never serves one user's session to another.
- **2026-10 — In development, the app runs as a guest by default** (`VITE_DEV_AUTH_BYPASS`), so it works without the auth API. Set it to `false` to test real login. It can never be on in production.

## Known gaps

- There's no way yet to move guest data into an account after signing up.
