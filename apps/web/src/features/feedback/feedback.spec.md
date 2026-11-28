# Feedback

## Purpose

Lets anyone, guest or signed in, send a short message to the Mado team from Settings.

**Depends on:** nothing in the web app. It calls the API. **Used by:** `settings` (the Feedback tab). See `apps/web/ARCHITECTURE.md`.

## Behavior

- **Settings, Feedback:** an **Email** field, a **Message** box, and **Send feedback**. No intro text: the tab name says what it is.
- Both fields are required. Send is off while either is empty or only spaces. The message can be up to 2000 characters.
- Enter makes a new line. Cmd+Enter (Ctrl+Enter on Windows) sends.
- A signed-in user finds their email already filled in. They can change it.
- While sending, the form is locked and the button says "Sending…".
- After a send, the form is replaced by "Thanks! Your feedback was sent." and a **Send more** button that brings back an empty form.
- On an error, the message stays in the box and the reason shows under the form: the server can't be reached, too many messages, a bad email, or a general failure.

## API

`POST /api/v1/feedback` with `{ message, email }`, in `apps/api/src/feedback/`.

- `message` is trimmed and must be 1–2000 characters. `email` is trimmed and must be a valid address. Anything else gets `400 invalid-feedback`. The body is checked before the rate limit, so junk never reaches the database.
- Each address (IP) can send 5 messages in any 60 minutes (a sliding window). The 6th gets `429 rate-limited`.
- A saved message answers `201`. A failed save answers `500 internal` and logs the error.
- Rows go into the Postgres table `feedback` (`id`, `message`, `email`, `ip_hash`, `created_at`). Read them with SQL. There is no admin page.
- `ip_hash` is an HMAC-SHA256 of the IP keyed with `BETTER_AUTH_SECRET`. Rows from before 2026-11 have no `ip_hash`, and some have no `email`.

## Decisions

- **2026-10 — Our own Postgres table, not Google Sheets.** The API and Postgres already exist, so it is one table and one route. Sheets would need a Google key, and its webhook URL is public, so we couldn't stop spam.
- **2026-10 — No user id on a row.** The email is enough to reply, and a guest has no id. It also keeps the route free of auth.
- **2026-11 — Email is required.** A message we can't answer is hard to act on, and asking for an email puts off casual spam.
- **2026-11 — The rate limit counts rows in Postgres, not in memory or with Cloudflare's rate limiter.** On Workers each isolate has its own memory, so an in-memory count let more through. Cloudflare's Rate Limiting binding only counts over 10 or 60 seconds and per location, so it can't do 5 per hour. Feedback is rare, so one `count(*)` per send is cheap. The count and the insert run in one transaction behind a per-IP advisory lock (`pg_advisory_xact_lock`), because otherwise a burst of parallel sends all read the same old count and all get saved. Postgres compares the times with its own `now()`, because JS time and the column can be in different zones.
- **2026-11 — Store an HMAC of the IP, not the IP.** A plain hash of an IPv4 address is easy to reverse, and the raw IP is personal data we don't need.
- **2026-10 — No "Buy me a coffee" link.** Buy Me a Coffee can't pay out to Taiwan. Revisit with a service that does.

## Known gaps

- No email to the team when a message arrives. Check the table by hand.
- No component tests (the web app has no `@testing-library` yet). The tab was checked in a browser.
- `ip_hash` is kept forever. Nothing clears it after the hour.
