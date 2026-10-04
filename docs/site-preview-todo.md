# Site Preview: To Do

Status of the website embed feature. Branch: `feat/site-preview-api`.

## Done

- `POST /api/v1/sites/preview` in `apps/api` (`src/sites/`)
- Embed check: `X-Frame-Options` and CSP `frame-ancestors`
- Official embeds: YouTube, Vimeo, Spotify, Figma
- Page metadata: title, description, favicon, OG image
- Safe fetch: blocks private addresses, limits time, size and redirects
- 124 tests, security review and code review fixed

## Before commit

- [ ] Add a rate limit to the endpoint (`express-rate-limit`)
- [ ] Commit the work: `feat: add site preview api`
- [ ] Check `apps/api/tsconfig.json`: a tool keeps adding `"rootDir": "."`. Do not commit that line.

## API: small extras

- [ ] Read `<meta charset>` in the HTML. Today only the `Content-Type` header is used, so some GBK or Shift_JIS pages show a garbled title.
- [ ] More link shapes: YouTube `/live/ID`, unlisted Vimeo `/123/abc`, Spotify `/intl-xx/track/...`
- [ ] Add a 200-response test for the route (needs a fake fetcher)
- [ ] Decide if only ports 80 and 443 should be allowed

## Web app (`apps/web`)

- [ ] Use the existing `{ kind: 'url' }` result from `detectPastedContent` in the paste hook
- [ ] Add a `website` kind to `Source` (today only `image` and `video`)
- [ ] Baseline: if the API cannot be reached, still try the iframe and always show "Open original site"
- [ ] Render the iframe with `sandbox` (no `allow-top-navigation`) and a strict `allow=` list
- [ ] Link card when `embed.mode` is `none`: title, image, description, "Open original site"
- [ ] Never fetch `favicon` or `ogImage` on the server without `safeFetch`
- [ ] Save `embedMode` and `embedCheckedAt` on the source

## Later (from the PRD)

- [ ] Hero screenshot worker (headless browser), `SiteCaptureStatus`
- [ ] `POST /api/v1/sites/:sourceId/refresh` to run the check again
- [ ] Store OG image and screenshot as media assets
