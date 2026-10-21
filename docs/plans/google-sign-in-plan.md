# Google sign-in: the only way in

Make "Continue with Google" the only sign-in in Settings → Account. Turn email and password off with a switch, but keep its code.

This is a plan only. App changes come after review.

## 1. What the user sees

- Signed-out users see one Google button. There are no email fields, no "Create an account" link, and no "Forgot password?" link.
- Click → choose a Google account → return to the same library or collection. First-time users get a Mado account in the same flow.
- Guest mode stays. Email and password code stays too, behind one switch per app that is off by default. Turning both switches on brings back today's forms.
- Use Google's official mark on the button.

### Account and library rules

- **New email:** create a user and open that user's local library.
- **Existing email user, verified:** Google with the same email links to that user. Keep the same Mado user ID and local library. This is how today's email users get back in.
- **Existing email user, unverified:** do not link (Better Auth returns `account_not_linked`). With email off, this user cannot get in. Show "This email already has an unfinished Mado account. Contact support." Known gap.
- **Email user whose Google account has another email:** cannot get in. Different-email linking stays off. Known gap.
- **Why the gaps are OK:** Mado has no real users yet, so no one is locked out.
- **Guest saves:** stay in the guest library. Signing in does not move or sync them.
- **Cancel or fail:** reopen Account with a short message and allow retry. Never show raw provider error text.

Use a full-page redirect. Returning from Google loads a fresh page, so Mado selects the right account storage before showing library data.

## 2. Code changes

The repository uses Better Auth 1.7.7. Its `account` table already has provider IDs and token fields. No new auth package, custom Google callback route, or database migration is needed.

| Function / location                                                                                                                     | Planned change                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAuth` / `readAuthConfig` in `apps/api/src/auth/auth.ts`                                                                          | Configure the Google provider; validate the two Google settings at startup. Read `AUTH_EMAIL_PASSWORD_ENABLED` (default `false`) into `emailAndPassword.enabled`, so Better Auth rejects email sign-in, sign-up and reset when it is off. Set linking rules explicitly: both emails verified, matching email only, no trust override. Set `onAPIError.errorURL` to the web settings URL so bad-state errors come back to Mado. Add a rate limit for `/sign-in/social`. |
| `isEmailPasswordAuthEnabled` (new) in `apps/web/src/features/auth/auth-session.ts`                                                      | Read `VITE_AUTH_EMAIL_PASSWORD_ENABLED`, next to `isDevAuthBypass`. Off unless set to `true`.                                                                                                                                                                                                                                                                                                                                                                          |
| `SETTINGS_SEARCH_KEYS` in `apps/web/src/features/settings/settings-search.ts`                                                           | Add `error_description`. Better Auth adds it beside `error` with raw provider text, and `hrefWithoutSettings` must drop it.                                                                                                                                                                                                                                                                                                                                            |
| `signInWithGoogle` (new) in `apps/web/src/features/auth/auth-actions.ts`                                                                | Build safe success and error URLs. Start social sign-in through `authClient`. Return friendly startup errors.                                                                                                                                                                                                                                                                                                                                                          |
| `useGoogleSignIn` (new) in `apps/web/src/features/auth/auth-hooks.ts`                                                                   | Own Google pending/error state, block repeat clicks, and recover when Back restores the page.                                                                                                                                                                                                                                                                                                                                                                          |
| `SettingsGoogleSignInButton` (new private helper) in `apps/web/src/components/settings/settings-auth-form.tsx`                          | Render the Google mark, label, busy state, and the "or use email" divider only when email is on. Use `type="button"`.                                                                                                                                                                                                                                                                                                                                                  |
| `SettingsAuthForm` / `SettingsAuthLinkStatus` in `apps/web/src/components/settings/settings-auth-form.tsx`                              | Wire the hook and button. When email is off, render only the Google button, its errors, and no mode links. When it is on, render today's form below the button. Show OAuth errors even when `verified` is absent; the current helper only shows email verification status.                                                                                                                                                                                             |
| Types in `apps/api/src/auth/auth.type.ts`, `apps/web/src/features/auth/auth.type.ts`, `apps/web/src/features/settings/settings.type.ts` | Add `AuthGoogleConfig` under `AuthConfig.google` and `emailPassword: boolean` to `AuthConfig`; add `AuthGoogleSignInState` and `SettingsGoogleSignInButtonProps`. Reuse `AuthFormResult`.                                                                                                                                                                                                                                                                              |

### Reuse as-is

`authClient`, `createAuthRouter`, `safeReturnTo`, `hrefWithoutSettings`, `parseSettingsSearch`, `loadPageSession`, `setStorageAccount`, `useSignOut`, and the shared `Button`. The current `error` URL param can carry callback errors.

Keep Google logic in the auth domain. Keep the button private beside its form, with helpers below their callers and types in dedicated type files.

## 3. Data flow

1. **Browser:** button → hook → action → `POST /api/auth/sign-in/social`.
2. **Google:** Better Auth redirects to account selection. Google returns a code to `/api/auth/callback/google`.
3. **Mado API:** Better Auth checks the callback, exchanges the code, saves the account and session in PostgreSQL, and sets the session cookie.

Then: safe app URL → `loadPageSession` → server session check → `user.id` → that account's IndexedDB and OPFS folders. Media stays on this device.

### Control flow

1. Accept one click. Show "Connecting…" and disable the button (and the email form, if it is on) while sign-in starts.
2. Clean the current path with `hrefWithoutSettings`, then check it with `safeReturnTo`. Keep unrelated query params and the hash.
3. Set `callbackURL` to that same-origin URL. Build `errorCallbackURL` from it, reopening `settings=account` in sign-in mode.
4. After Google returns, Better Auth creates or finds the user. A normal page load reads the new session before opening account storage.
5. On a returned error, map known codes to fixed copy: `access_denied` (canceled), `account_not_linked`, `state_mismatch` / `state_not_found`, and `unable_to_link_account`. For unknown codes, show "Could not sign in with Google. Please try again."
6. If the browser restores this page using Back, clear stale pending state on `pageshow`.

## 4. Pseudocode

### New: `signInWithGoogle(returnTo)`

```text
cleanPath = safeReturnTo(hrefWithoutSettings(returnTo))
successURL = new URL(cleanPath, window.location.origin)
errorURL = copy(successURL)
errorURL.searchParams.set("settings", "account")

result = await authClient.signIn.social({
  provider: "google",
  callbackURL: successURL.href,
  errorCallbackURL: errorURL.href
})
if result.error:
  return friendly rate-limit or startup error
return {}
```

### New: `useGoogleSignIn()`

```text
hold pending and error state; use a ref to block duplicate starts
listen for pageshow → clear stale pending/ref state
remove listener when the hook unmounts

start(returnTo):
  if already starting: return
  set starting ref and pending; clear error
  try:
    result = await signInWithGoogle(returnTo)
    if result.error: show error and unlock
    otherwise keep pending until navigation
  catch:
    show connection error and unlock

return { start, pending, error }
```

### New: `SettingsGoogleSignInButton(props)`

```text
render shared Button:
  type = button
  disabled = props.pending
  onClick = props.onSignIn
  decorative official Google mark
  label = pending ? "Connecting…" : "Continue with Google"
if props.showEmailDivider: render divider "or use email"
```

### Update: `readAuthConfig` / `createAuth`

```text
readAuthConfig(env):
  validate existing settings plus GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
  AUTH_EMAIL_PASSWORD_ENABLED: "true" | "false", default "false"
  report missing field names without values
  return config with google: { clientId, clientSecret }, emailPassword: boolean

createAuth(dependencies):
  keep current database, email, session, origin and cookie setup
  emailAndPassword.enabled = config.emailPassword
  onAPIError.errorURL = webOrigin + "/library?settings=account"
  add socialProviders.google from config.google
  request account selection and basic identity scopes only
  explicitly require verified local email for same-email linking
  keep trustedProviders empty and different-email linking off
  apply a sign-in/social rate limit
  return Better Auth instance
```

### Update: `SettingsAuthForm` / `SettingsAuthLinkStatus`

```text
SettingsAuthForm(props):
  call useGoogleSignIn()
  render SettingsGoogleSignInButton; onSignIn → google.start(window.location.href)
  show google error using existing alert styling
  if not isEmailPasswordAuthEnabled(): stop here (no form, no mode links)
  otherwise keep today's email form and links below the button
  pending = emailPending OR googlePending

SettingsAuthLinkStatus(props):
  if linkError is an OAuth code:
    access_denied → "Google sign-in was canceled. Please try again."
    account_not_linked → "This email already has an unfinished Mado account. Contact support."
    otherwise → fixed generic failure message
  else if email is on: keep existing verification and reset-link behavior
```

## 5. Setup before testing

1. Create a Google OAuth client for a **Web application**. Set up the app's consent screen and test users if it is in testing mode.
2. Register the exact local redirect URI: `http://localhost:3100/api/auth/callback/google`. Port 3100 is the public web origin; its proxy forwards `/api` to port 4000.
3. For production, register the real HTTPS origin followed by `/api/auth/callback/google`. Keep `BETTER_AUTH_URL` and `WEB_ORIGIN` on that origin.
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the API environment. Both are required to start the API. Update `apps/api/.env.example` and test fixtures. Keep values out of browser builds.
5. Leave `AUTH_EMAIL_PASSWORD_ENABLED` (API) and `VITE_AUTH_EMAIL_PASSWORD_ENABLED` (web) unset to keep email off. Set both to `true` to bring it back. SMTP settings stay required for now, so turning email back on needs no config change.
6. Set `VITE_DEV_AUTH_BYPASS=false` in `apps/web/.env.local` and restart the web app for real login tests.

References: [Better Auth Google guide](https://better-auth.com/docs/authentication/google), [Google web server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server) (the registered return URL must match exactly), [Better Auth account linking](https://better-auth.com/docs/concepts/users-accounts#account-linking).

## 6. Checks and delivery order

| Step                 | Evidence needed                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. API setup         | Extend `auth.test.ts`: required config fields, social redirect URL and scopes, rate limits, rejected return URLs. With the email switch off, email sign-in, sign-up and reset are rejected. With it on, today's email tests still pass. Reuse the PGlite setup. |
| 2. Callback behavior | Mock Google's token and profile responses through real Better Auth handlers: new user, returning user, verified same-email linking with unchanged user ID, unverified collision, cancel, and bad OAuth state. Confirm no session on failed callbacks.           |
| 3. Web changes       | Add focused action tests for clean callbacks and startup failures. Check the button by hand: keyboard use, double click, busy state, error retry, and Back navigation. Check small screens.                                                                     |
| 4. Account storage   | Real browser: Google login → correct account library → sign out → original guest library. Test a second account and another open tab. Sign in with Google as an existing verified email user and check the same library opens.                                  |
| 5. Ship together     | Run API and web tests, type checks, lint, and web build. Test real Google login with development credentials, then verify the deployed HTTPS callback and session cookie.                                                                                       |

### Docs in the implementation change

- Update `auth.spec.md`, `settings.spec.md`, and `apps/web/ARCHITECTURE.md` with the redirect and error flow.
- Add a decision to `auth.spec.md`: Google is the only sign-in, email code stays behind the switch, and the known gaps (unverified email users, email users without a matching Google account).
- Fix `docs/auth-setup.md`, which still points to removed standalone auth pages, and add the Google setup steps.

**Ready when:** a new or existing user can sign in through Google, recover from a canceled attempt, and reach the right local library; email forms are hidden and email routes are rejected. Real Google testing needs the client credentials.
