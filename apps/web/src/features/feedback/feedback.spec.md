# Feedback

## Purpose

Lets anyone, guest or signed in, send a short message to the Mado team from Settings.

**Depends on:** nothing in the web app. It calls the API. **Used by:** `settings` (the Feedback tab). See `apps/web/ARCHITECTURE.md`.

## Behavior

- **Settings, Feedback:** a short note, a **Message** box, an optional **Email** field ("Only if you want a reply"), and **Send feedback**.
- Send is off while the message is empty or only spaces. The message can be up to 2000 characters.
- Enter makes a new line. Cmd+Enter (Ctrl+Enter on Windows) sends.
- A signed-in user finds their email already filled in. They can change it or clear it.
- While sending, the form is locked and the button says "Sending…".
- After a send, the form is replaced by "Thanks! Your feedback was sent." and a **Send more** button that brings back an empty form.
- On an error, the message stays in the box and the reason shows under the form: the server can't be reached, too many messages, a bad email, or a general failure.

## API

`POST /api/v1/feedback` with `{ message, email }`, in `apps/api/src/feedback/`.

- `message` is trimmed and must be 1–2000 characters. `email` is empty or a valid address. Anything else gets `400 invalid-feedback`.
- Each address (IP) can send 5 messages per hour. The 6th gets `429 rate-limited`.
- A saved message answers `201`. A failed save answers `500 internal` and logs the error.
- Rows go into the Postgres table `feedback` (`id`, `message`, `email`, `created_at`). Read them with SQL. There is no admin page.

## Decisions

- **2026-10 — Our own Postgres table, not Google Sheets.** The API and Postgres already exist, so it is one table and one route. Sheets would need a Google key, and its webhook URL is public, so we couldn't stop spam.
- **2026-10 — No user id on a row.** The email is enough to reply, and a guest has no id. It also keeps the route free of auth.
- **2026-10 — The rate limit lives in memory.** Feedback is rare, and losing the counts on a restart is harmless. Revisit if the API runs on many instances.
- **2026-10 — No "Buy me a coffee" link.** Buy Me a Coffee can't pay out to Taiwan. Revisit with a service that does.

## Known gaps

- No email to the team when a message arrives. Check the table by hand.
- No component tests (the web app has no `@testing-library` yet). The tab was checked in a browser.
- The rate limit is per API instance, so on several instances it allows more.
