# Deploy Mado on Cloudflare

Run the web app and the API on Cloudflare Workers before the launch. The landing page needs the web app, and sign-in and site previews need the API.

**Decision (2026-10, proposed):** host everything on Cloudflare: Workers for the web and the API, Hyperdrive to reach a hosted Postgres, and R2 for media later (phase 3). One platform is cheap and simple for a side project. Confirm it after the spike in step 1.

This is a plan only. App changes come after review.

## 1. What changes for the user

Nothing. Mado runs at its real domain instead of localhost. Sign-in, site previews and the local library work as they do today.

## 2. Shape

```text
mado.app/*        → web Worker  (TanStack Start)
mado.app/api/*    → API Worker  (Express via httpServerHandler)
                        │
                        └─ Hyperdrive → hosted Postgres (Neon)
```

- **One domain, two Workers.** A Workers route sends `/api/*` to the API Worker. The cookie stays first-party, and the browser keeps calling `/api` like the Vite proxy does in dev.
- **The web Worker reaches the API through a service binding**, not `fetch(API_ORIGIN)`. A Worker can't reliably `fetch` another Worker on the same zone, and a binding skips the public network.
- **Postgres stays Postgres.** Neon hosts it. Hyperdrive pools connections, because Workers open a new connection on every request.

## 3. Code changes

| Function / location                                                                 | Planned change                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/worker.ts` (new)                                                      | The Workers entry. Builds the config from the Worker env, uses the Hyperdrive connection string, creates the app, and exports it through `httpServerHandler`.                                                                                                                                                         |
| `apps/api/wrangler.jsonc` (new)                                                     | `nodejs_compat`, a compatibility date after 2025-08-15, the Hyperdrive binding, the `/api/*` route, and secrets (Google keys, auth secret).                                                                                                                                                                           |
| `safeFetch` / `followRedirects` / `request` in `apps/api/src/sites/site-preview.ts` | Swap `node:http` + the guarded `dns.lookup` for global `fetch` with `redirect: 'manual'`. Keep the loop that checks every redirect, the timeout, the size limit and `isPrivateAddress` for hosts that are plain IPs. Why: Workers don't support a custom `lookup`, and a Worker can't reach a private network anyway. |
| `createAuth` in `apps/api/src/auth/auth.ts`                                         | Load `nodemailer` with a dynamic `import()` only when email is on. Why: email is paused, and nodemailer needs raw TCP that Workers may not give it. When email comes back, use an email API (like Resend) instead.                                                                                                    |
| `createDatabase` in `apps/api/src/database/database.ts`                             | Accept a pool size, and use `max: 1` on Workers. Hyperdrive does the pooling.                                                                                                                                                                                                                                         |
| `apps/api/src/server.ts`                                                            | No change. It stays the local dev entry with `app.listen()`.                                                                                                                                                                                                                                                          |
| `apps/web/vite.config.ts` + `apps/web/wrangler.jsonc` (new)                         | Add `@cloudflare/vite-plugin` as the TanStack Start docs describe. Add the `API` service binding and the `/*` route.                                                                                                                                                                                                  |
| `loadPageSession` in `apps/web/src/features/auth/auth-session.ts`                   | Call `env.API.fetch(...)` when the binding exists, else `fetch(API_ORIGIN)` for local dev.                                                                                                                                                                                                                            |
| Google OAuth settings (Google Cloud console)                                        | Add `https://mado.app/api/auth/callback/google` as a redirect URI.                                                                                                                                                                                                                                                    |

### Reuse as-is

`createApp`, `readAuthConfig`, `readFlags`, `createAuthRouter`, `createSitesRouter`, `isPrivateAddress`, the Drizzle schema and migrations. Rate limiting already uses `storage: 'database'`, so it works across Worker instances with no change.

## 4. Data flow

1. Browser → `mado.app/api/v1/sites/preview` → API Worker → `fetch(site)` → metadata back to the browser.
2. Browser → `mado.app/api/auth/*` → API Worker → better-auth → Hyperdrive → Neon → session cookie.
3. Web Worker server function → `env.API.fetch('/api/auth/get-session')` → API Worker → session → picks the account's local storage in the browser, as today.

Media never touches the server until phase 3.

## 5. Control flow

1. **Spike first:** deploy the API Worker with only `/api/health` and one query through Hyperdrive. If a module-level Express app with a `pg` pool fails across requests ("I/O on behalf of a different request"), create the pool per request. If Express itself fights us, move the three routers to Hono; they are small.
2. Port `safeFetch` to `fetch`. Run the site preview tests.
3. Make nodemailer lazy. Check that the Worker bundle builds without it.
4. Deploy the API Worker on a preview domain. Point Google OAuth at it.
5. Add the Cloudflare plugin to the web app, add the binding, and deploy on the preview domain.
6. Run migrations against Neon from a laptop with the direct (non-Hyperdrive) URL.
7. Move both to the real domain.

## 6. Pseudo code

```ts
// apps/api/src/worker.ts
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';

const config = readAuthConfig({
  ...env,
  DATABASE_URL: env.HYPERDRIVE.connectionString,
});
const { db } = createDatabase(config.databaseUrl, { max: 1 });
const auth = createAuth({ database: db, config });
createApp({ auth, webOrigin: config.webOrigin }).listen(PORT);

export default httpServerHandler({ port: PORT });
```

```ts
// safeFetch, fetch version
for (let redirects = 0; ; redirects++) {
  assertHttpProtocol(url);
  assertNotPrivateIp(url.hostname); // plain IP hosts and localhost
  const res = await fetch(url, { redirect: 'manual', signal, headers });
  const location = res.headers.get('location');
  if (REDIRECT_STATUSES.has(res.status) && location) {
    if (redirects >= MAX_REDIRECTS)
      throw new SafeFetchError('too-many-redirects');
    url = new URL(location, url);
    continue;
  }
  return { res, finalUrl: url };
}
```

## 7. How we verify

- **Unit tests:** `pnpm test` in `apps/api` and `apps/web` pass. Site preview tests cover: redirect to a private IP is refused, too many redirects, timeout, the size limit.
- **Local Workers:** `wrangler dev` for both Workers. Sign in with Google, open a site preview, reload a page that checks the session.
- **Preview domain:** the same three checks on the deployed preview, plus `/api/health`.
- **Security:** `POST /api/v1/sites/preview` with `http://127.0.0.1`, `http://169.254.169.254` and a redirect to them is refused.

## 8. Cost

Start on the free plans: Workers, Hyperdrive and Neon. Move to Workers Paid (about $5/month) when traffic or CPU limits need it. Check the current limits before launch.

## Known gaps

- Email sign-in stays off on Cloudflare until it moves to an email API.
- Site previews fetch from Cloudflare's network, so a few sites that block data-center traffic may fail more often than from a home server.
