# Authentication

Mado uses Express + Better Auth + PostgreSQL + Drizzle. Auth routes live in
`apps/api/src/auth/auth.route.ts`; custom handlers live in `auth.controller.ts`;
Drizzle tables live in `auth.model.ts`. Better Auth handles its own built-in
sign-up, sign-in, verification, session, and password-reset endpoints.

## Where the code lives

API (`apps/api/src`):

- `auth/auth.ts` — Better Auth setup and env config (`createAuth`, `readAuthConfig`)
- `auth/auth.route.ts` + `auth.controller.ts` — Express routes and handlers
- `auth/auth.model.ts` — Drizzle tables; `database/schema.ts` collects all tables

Web (`apps/web/src`):

- `routes/(auth)/` — sign-in, sign-up, forgot/reset password, verify email pages
- `routes/(app)/route.tsx` — session check for every app page, sign-out button
- `features/auth/auth-session.ts` — loads the session, `safeReturnTo`
- `features/auth/auth-actions.ts` — calls Better Auth for each form
- `features/storage/storage-account.ts` — current account; scopes local data
- `components/auth/` — auth page UI

## Run locally

Use Node.js 24 or later and pnpm. From the project root:

1. Start Docker, then run `docker compose up -d`.
2. Copy `apps/api/.env.example` to `apps/api/.env`.
3. Generate a secret with `openssl rand -base64 32` and set `BETTER_AUTH_SECRET`.
4. Run `pnpm --filter api db:migrate`.
5. Run `pnpm dev`.
6. Open `http://localhost:3100/sign-up`.
7. Open `http://localhost:8025` for verification and password-reset emails.

Mailpit is a local email inbox. Production needs a real SMTP server. Required
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

- `/sign-up`, `/sign-in`, `/verify-email`, `/forgot-password`, `/reset-password`:
  public account pages.
- `/library` and `/collection`: open to guests (local data); signed-in users
  get their own account storage.
- `/api/auth/*`: Better Auth endpoints, mounted before the Express JSON parser.
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
the device; it clears in-memory query data and reloads to the sign-in page.

## Production

Serve the web app and `/api` under one HTTPS origin. The Vite dev proxy handles
this locally; your production reverse proxy must forward `/api` to Express.
Set `BETTER_AUTH_URL` and `WEB_ORIGIN` to that public origin without a trailing
slash. Set server-only `API_ORIGIN` on the web server to the internal API origin.
Keep auth secrets, database credentials, and SMTP credentials server-only.

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
