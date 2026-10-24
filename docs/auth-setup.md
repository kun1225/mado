# Authentication

Mado uses Express + Better Auth + PostgreSQL + Drizzle. Auth routes live in
`apps/api/src/auth/auth.route.ts`; custom handlers live in `auth.controller.ts`;
Drizzle tables live in `auth.model.ts`. Better Auth handles its own built-in
Google sign-in, session, and (when turned on) email and password endpoints.

Google is the only sign-in for now. Each sign-in method has a feature flag (see
`apps/web/src/features/flags/flags.spec.md`):

- Google: `FLAG_AUTH_GOOGLE` (API) and `VITE_FLAG_AUTH_GOOGLE` (web). On by
  default. When off, the API needs no Google credentials and rejects Google
  sign-in.
- Email and password: `FLAG_AUTH_EMAIL_PASSWORD` (API) and
  `VITE_FLAG_AUTH_EMAIL_PASSWORD` (web). Off by default. While it is off, the
  reset and verification routes return 404.

## Where the code lives

API (`apps/api/src`):

- `auth/auth.ts` — Better Auth setup and env config (`createAuth`, `readAuthConfig`)
- `auth/auth.route.ts` + `auth.controller.ts` — Express routes and handlers
- `auth/auth.model.ts` — Drizzle tables; `database/schema.ts` collects all tables

Web (`apps/web/src`):

- `routes/(app)/route.tsx` — session check for every app page
- `features/auth/auth-session.ts` — loads the session, `safeReturnTo`, the email switch
- `features/auth/auth-actions.ts` — `signInWithGoogle` and the email form calls
- `features/auth/auth-hooks.ts` — `useGoogleSignIn`, `useSignOut`
- `features/storage/storage-account.ts` — current account; scopes local data
- `components/settings/settings-auth-form.tsx` — the sign-in UI in Settings → Account

## Run locally

Use Node.js 24 or later and pnpm. From the project root:

1. Start Docker, then run `docker compose up -d`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Generate a secret with `openssl rand -base64 32` and set `BETTER_AUTH_SECRET`.
4. Create a Google OAuth client of type **Web application**. Add the redirect
   URI `http://localhost:3100/api/auth/callback/google`, then set
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. If the consent screen is in
   testing mode, add your Google account as a test user.
5. Run `pnpm --filter api db:migrate`.
6. Set `VITE_DEV_AUTH_BYPASS=false` in `apps/web/.env.local`, then run `pnpm dev`.
7. Open `http://localhost:3100/library?settings=account` and click
   **Continue with Google**.

With email turned back on, open `http://localhost:8025` for verification and
password-reset emails.

Mailpit is a local email inbox. SMTP settings stay required even while email is
paused, so turning it back on needs no new config. Required
settings are checked when the API starts; no secret has a built-in default.
Database migrations run only when requested. Use `pnpm --filter api db:generate`
after changing tables, review the SQL, then run `db:migrate`.

## Development login bypass

`pnpm dev` opens the app as a guest by default. Guests use the device's local
data (the `mado` IndexedDB database and the root `media` folder), the same data
as before login existed. No auth API or database is needed to open the library. The API still needs its normal setup
for backend features; protected API endpoints still require a real session.

To test real login, set `VITE_DEV_AUTH_BYPASS=false` in `apps/web/.env.local`
and restart the web dev server. Production builds always check the real
session, even if this flag is true. Signed-in users get their own account
storage. Guests are not sent to sign-in, and the sign-out button only shows
when signed in.

## Routes

- `/library` and `/collection`: open to guests (local data); signed-in users
  get their own account storage.
- `/api/auth/*`: Better Auth endpoints, mounted before the Express JSON parser.
  Google returns to `/api/auth/callback/google`. Errors with no page to return
  to go to `/library?settings=account&error=…`.
- `/api/me`: a protected example endpoint that returns public user fields.
- `/api/health` and existing site preview endpoints: remain public.

Passwords need 12–128 characters. Verification links expire after one hour;
reset links expire after 30 minutes. Password resets revoke existing sessions.
Session cookies expire after seven days and refresh after one day. Server-side
page checks do not refresh cookies; normal browser session calls do.

## Local saves

Each signed-in account gets its own IndexedDB database, media directory, and
recent searches. This is local storage, not server sync or encryption. It does
not protect files from someone who can inspect the browser profile.

Old anonymous saves stay untouched in the original `mado` database and `media`
directory. They are not automatically assigned to an account. Importing old
saves and syncing data are separate features. Sign-out keeps account saves on
the device; it clears in-memory query data and reloads to the guest library.

## Production

Serve the web app and `/api` under one HTTPS origin. The Vite dev proxy handles
this locally; your production reverse proxy must forward `/api` to Express.
Set `BETTER_AUTH_URL` and `WEB_ORIGIN` to that public origin without a trailing
slash. Set server-only `API_ORIGIN` on the web server to the internal API origin.
Register `https://<origin>/api/auth/callback/google` in the Google client.
Keep auth secrets, Google credentials, database credentials, and SMTP
credentials server-only.

Set `NODE_ENV=production` to require HTTPS and secure cookies. Configure
`TRUST_PROXY` only for the addresses of your reverse proxies. Those proxies must
replace incoming forwarding headers with the real client address. Express
replaces the internal auth IP header before Better Auth sees it; database-backed
rate limits use that address and work across API processes. Without proxy trust,
all requests behind a proxy share its rate-limit bucket.

The SMTP server must support your selected TLS mode. Set `SMTP_SECURE=true` for
implicit TLS (usually port 465). For port 587, use `SMTP_SECURE=false`; Nodemailer
negotiates STARTTLS. Configure the SMTP domain and delivery settings before launch.

## Checks

`pnpm --filter api test` runs the real Better Auth handlers and Drizzle migrations
against in-memory PostgreSQL (PGlite), with a captured email transport. It does
not need Docker. Also run both packages' `check-types` and the web build.
