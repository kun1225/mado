# Mado

Mado is a design inspiration curation app.

## Workspace

- `apps/web` — TanStack Start web application
- `apps/api` — Express API
- `packages/ui` — shared React components

## Development

Install dependencies:

```sh
pnpm install
pnpm --filter api install-browser
```

The browser is required for website screenshots.

Run the web application and API:

```sh
pnpm dev
```

Run one application:

```sh
pnpm --filter web dev
pnpm --filter api dev
```

The web application uses port `3100`.

The API uses port `4000`.
Set `VITE_API_ORIGIN` in the web app when the API uses another origin.
Set `WEB_ORIGIN` in the API when the web app uses another origin.

Health check:

```sh
curl http://localhost:4000/api/health
```
