# Feature flags

Flags turn a feature on or off without changing code. Each flag is the same for
everyone and changes only when you rebuild the web app or restart the API.

## Behavior

- A flag is `true` or `false`. If it is not set, it uses its default.
- Web: `isFlagOn('name')` from `flags.ts`. Any value other than `true` or
  `false` keeps the default, so a bad value can't break the page.
- API: `readFlags()` in `apps/api/src/flags/flags.ts`. Any value other than
  `true` or `false` stops the API from starting, so a typo can't turn a
  feature on by accident.
- Each flag exists in both apps with the same name: `authGoogle` is
  `VITE_FLAG_AUTH_GOOGLE` in the web app and `FLAG_AUTH_GOOGLE` in the API.

| Flag                | Default | What it controls                                      |
| ------------------- | ------- | ----------------------------------------------------- |
| `authGoogle`        | on      | Google sign-in                                        |
| `authEmailPassword` | off     | Email and password sign-up, sign-in, reset, verifying |

## Adding a flag

1. Add the name to `FlagName` in `flags.type.ts` and an entry to `FLAGS`.
2. If the API takes part, add it to `ApiFlags` and `flagSchema`.
3. Add both env names to the two `.env.example` files and a row to the table above.

## Decisions

- **2026-10 — Code calls `isFlagOn`, never the env.** The source can move to the
  API later (for per-user flags) without changing any caller.
- **2026-10 — The API is the real gate.** A web flag only hides UI. Anything a
  user could call directly must also be blocked in the API.
- **2026-10 — Remove a flag once its feature is stable.** A flag that stays
  forever becomes a hidden setting and an untested code path.

## Known gaps

- No per-user flags or percent rollouts yet. That needs a database table and a
  `GET /api/v1/flags` endpoint.
- The web and API copies of a flag can disagree. Then the button shows but the
  API rejects it, or the other way round.
