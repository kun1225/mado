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
```

Run the web application and API:

```sh
pnpm dev
```

Run one application:

```sh
pnpm --filter web dev
pnpm --filter api dev
```

The web application uses port `3000`.

The API uses port `4000`.

Health check:

```sh
curl http://localhost:4000/api/health
```
