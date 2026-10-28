## Code Organization

- Keep the primary exported function near the top of its implementation file so the developer can see the prmiary function when they get into the file.
- Order functions by their call hierarchy. Place the primary function first, then place each helper after its caller in call order.
- Add a `// *** FunctionName ***` comment before each secondary function to make the call hierarchy visible.
- Keep helper functions private by default. Export a helper only when direct testing provides real value, and place test-facing exports in a final export block.
- Keep feature-specific implementation details in the feature module when they have no independent reuse.
- Extract feature types into a dedicated `<feature>.type.ts` file.
- Prefix feature types with the feature name and use PascalCase, such as `SitePreviewHtmlMetadata`.

## Feature Specs

- Each feature folder may have a `<feature>.spec.md`. It records user-facing behavior, decisions with their reasons, and known gaps.
- Read `apps/web/ARCHITECTURE.md` first to see how the domains relate, then read the spec of the feature you change.
- When you change behavior, a decision, or a dependency between domains, update the spec and `ARCHITECTURE.md` in the same commit. A wrong spec is worse than no spec.
- When you add a spec, add a row to the table below.

| Doc                                                                                                              | Purpose                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`apps/web/ARCHITECTURE.md`](apps/web/ARCHITECTURE.md)                                                           | Layers, domain dependencies, external API calls, and key flows across domains                         |
| [`docs/roadmap.md`](docs/roadmap.md)                                                                             | Product direction and phases: free local launch, cloud, AI, client sharing, then teams                |
| [`apps/web/src/features/sources/sources.spec.md`](apps/web/src/features/sources/sources.spec.md)                 | Saved images, videos and websites: adding, compression, the detail dialog, replacing files, the trash |
| [`apps/web/src/features/collections/collections.spec.md`](apps/web/src/features/collections/collections.spec.md) | Collections and nested folders: naming, what a collection shows, counts, previews, deleting           |
| [`apps/web/src/features/search/search.spec.md`](apps/web/src/features/search/search.spec.md)                     | Name search over collections and sources, and recent searches                                         |
| [`apps/web/src/features/auth/auth.spec.md`](apps/web/src/features/auth/auth.spec.md)                             | Optional accounts, guest mode, sign-in flows, safe redirects, account switching                       |
| [`apps/web/src/features/settings/settings.spec.md`](apps/web/src/features/settings/settings.spec.md)             | The settings dialog: tabs, the account tab, sign in/out, and the URL params email links use           |
| [`apps/web/src/features/storage/storage.spec.md`](apps/web/src/features/storage/storage.spec.md)                 | IndexedDB and OPFS per account, migrations, rules for schema changes                                  |
| [`apps/web/src/features/export/export.spec.md`](apps/web/src/features/export/export.spec.md)                     | Export all sources as a zip: folder layout, file names, `library.json` for import                     |
| [`apps/web/src/features/flags/flags.spec.md`](apps/web/src/features/flags/flags.spec.md)                         | Feature flags in the web app and API: how to add, read and remove one                                 |
| [`apps/web/src/features/import/import.spec.md`](apps/web/src/features/import/import.spec.md)                     | Import a folder or an unzipped export: ids, skipped files, the folder-to-collection rule              |
| [`apps/web/src/features/feedback/feedback.spec.md`](apps/web/src/features/feedback/feedback.spec.md)             | The Feedback tab in settings and `POST /api/v1/feedback`: fields, rate limit, why not Google Sheets   |
| [`apps/web/src/features/landing/landing.spec.md`](apps/web/src/features/landing/landing.spec.md)                 | The landing page at `/`: sections, the intro, word reveal, the real library in a "try it" frame       |
| [`apps/web/src/features/projects/projects.spec.md`](apps/web/src/features/projects/projects.spec.md)             | (Planned) Brand projects: brief, picked sources, canvases                                             |
| [`apps/web/src/features/canvas/canvas.spec.md`](apps/web/src/features/canvas/canvas.spec.md)                     | (Planned) The infinite canvas in a project, and the canvas library choice                             |
