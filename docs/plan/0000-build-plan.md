# Mado Build Plan

This plan derives from `design-inspiration-library-architecture.md`.

The sequence prioritizes the domain model, web UI, and local uploads.

Authentication follows after the local product works.

PostgreSQL and R2 follow after authentication works.

The SwiftUI client begins after the remote API is stable.

## Delivery principles

- [ ] Keep guest mode fully usable without authentication.
- [ ] Use the same entity identifiers across local and remote storage.
- [ ] Keep UI components independent from IndexedDB, OPFS, PostgreSQL, and R2.
- [ ] Access persistence through repository interfaces and application services.
- [ ] Separate media identity, media variants, and physical locations.
- [ ] Use server capabilities for authorization instead of frontend plan-name checks.
- [ ] Complete and verify each milestone before starting the next milestone.
- [ ] Record major architecture decisions in `docs/decisions/`.

## Phase 1 — Domain model, web UI, and local storage

### 1.1 Define the first release

- [ ] Define the first release around one personal workspace.
- [ ] Support collections, nested folders, tags, and items.
- [ ] Support changing the item title, urls, tags, note.
- [ ] Keep the personal workspace internal and hide workspace concepts from the interface.
- [ ] Add Saved as the first cross-library item view.
- [ ] Support image uploads as the first complete media path.
- [ ] Support browser-compatible video uploads after images are stable.
- [ ] Support manually entered website URLs without remote capture. 
- [ ] Support enter `ctrl+v` directly to save a website item.
- [ ] Add the Deleted tab, restore actions, and target 30-day retention policy.
- [ ] Defer billing, sharing, collaboration, semantic search, and automatic website capture.
- [ ] Defer cloud synchronization until the cloud persistence path works.
- [ ] Define supported browsers for IndexedDB and OPFS.
- [ ] Show a clear unsupported-browser state when OPFS is unavailable.

Exit criteria:

- [ ] Document the release scope and explicit exclusions.
- [ ] Confirm that every planned screen supports the first release.

### 1.2 Create the domain package

- [ ] Add a framework-independent domain package under `packages/domain`.
- [ ] Define `Workspace`, `Collection`, `Folder`, `Item`, `Source`, and `Tag` types.
- [ ] Define `SiteSource`, `MediaSource`, `MediaVariant`, and `MediaLocation` types.
- [ ] Define `ItemType` as `image`, `video`, or `site`.
- [ ] Define `PersistenceMode` as `local`, `cloud`, or `both`.
- [ ] Define media location providers as `opfs`, `r2`, and `cloudflare_stream`.
- [ ] Define processing and location status unions.
- [ ] Define timestamps, soft deletion fields, positions, and entity versions.
- [ ] Add nullable `savedAt` to `Item`.
- [ ] Use `crypto.randomUUID()` for client-generated identifiers.
- [ ] Define constructors or validation schemas for every persisted entity.
- [ ] Reject a folder whose parent belongs to another collection.
- [ ] Reject circular folder ancestry.
- [ ] Keep domain types independent from React and persistence libraries.
- [ ] Export domain types for the web and API applications.

Exit criteria:

- [ ] Add unit tests for valid and invalid domain records.
- [ ] Confirm that the web and API applications consume the same TypeScript types.

### 1.3 Define repository and application interfaces

- [ ] Define metadata repositories for workspaces, collections, folders, items, sources, and tags.
- [ ] Define a media repository for binary creation, reading, and deletion.
- [ ] Define transaction boundaries for related metadata writes.
- [ ] Define application services for collection and folder operations.
- [ ] Define application services for item creation, editing, movement, and deletion.
- [ ] Define application services for tags and item-tag assignments.
- [ ] Define queries for library navigation, filtering, and item details.
- [ ] Define `saveItem` and `unsaveItem` application operations.
- [ ] Define a Saved query for non-deleted items with `savedAt`.
- [ ] Return domain results and typed errors from application services.
- [ ] Prevent UI components from calling storage adapters directly.

Exit criteria:

- [ ] Test application services with in-memory repository implementations.
- [ ] Confirm that storage adapters can change without component changes.

### 1.4 Establish the visual system

- [ ] Define color, typography, spacing, radius, shadow, and motion tokens.
- [ ] Define responsive breakpoints and content widths.
- [ ] Define light and dark appearance behavior.
- [ ] Add accessible focus, hover, pressed, selected, disabled, and error states.
- [ ] Build primitives for buttons, icon buttons, inputs, dialogs, menus, tabs, badges, and tooltips.
- [ ] Build primitives for empty states, skeletons, progress indicators, and notices.
- [ ] Verify keyboard navigation for every interactive primitive.
- [ ] Verify visible focus and sufficient color contrast.

Exit criteria:

- [ ] Create a development gallery for all reusable UI states.
- [ ] Verify the gallery at mobile, tablet, and desktop widths.

### 1.5 Build the application shell

- [ ] Build the library route as the main product surface.
- [ ] Add a collapsible sidebar for collection and folder navigation.
- [ ] Add a top bar with search, view controls, storage status, and account actions.
- [ ] Add All and Saved views without exposing workspace controls.
- [ ] Add a responsive mobile navigation pattern.
- [ ] Add breadcrumbs for collection and folder context.
- [ ] Add grid and list presentation modes.
- [ ] Persist display preferences locally.
- [ ] Add loading, empty, unsupported, and failure states.
- [ ] Use realistic fixtures before connecting persistence.

Exit criteria:

- [ ] Navigate the complete shell using only the keyboard.
- [ ] Verify stable layouts for empty, small, and large fixture collections.

### 1.6 Build organization workflows

- [ ] Add collection creation, rename, reorder, and deletion flows.
- [ ] Add folder creation, rename, movement, nesting, and deletion flows.
- [ ] Require confirmation when deletion affects child content.
- [ ] Add tag creation, editing, assignment, and removal flows.
- [ ] Add item movement between collections and folders.
- [ ] Add save and unsave actions to item cards and item details.
- [ ] Keep deleted items outside the current interface until the Deleted tab is planned.
- [ ] Add multi-select for batch movement, tagging, and deletion.
- [ ] Add optimistic UI only where rollback behavior is clear.
- [ ] Announce mutation results to assistive technologies.

Exit criteria:

- [ ] Complete every organization flow with in-memory repositories.
- [ ] Verify destructive actions and cancellation paths.

### 1.7 Build item presentation and details

- [ ] Build image, video, and website cards with consistent metadata areas.
- [ ] Add selected, loading, broken-media, and processing card states.
- [ ] Build the item detail route at `/items/:itemId`.
- [ ] Add title, description, collection, folder, tags, dates, and source details.
- [ ] Add image preview with contained and actual-size modes.
- [ ] Add native video playback for supported local formats.
- [ ] Add website URL, domain, manual metadata, and external navigation.
- [ ] Add thumbnail selection when several local variants exist.
- [ ] Add item editing and deletion actions.

Exit criteria:

- [ ] Open each item type from both grid and list modes.
- [ ] Verify missing files and invalid URLs without page failure.

### 1.8 Implement IndexedDB metadata storage

- [ ] Select a small IndexedDB wrapper with migration support.
- [ ] Create stores for every local domain entity.
- [ ] Create stores for `itemTags`, `preferences`, `changeLog`, and `syncStates`.
- [ ] Add indexes for workspace, collection, folder, type, tag, and updated time.
- [ ] Add an index for item saved time.
- [ ] Add an explicit schema version and migration runner.
- [ ] Seed one personal workspace during first use.
- [ ] Implement local metadata repositories.
- [ ] Use transactions for related source, item, variant, and location records.
- [ ] Preserve entity identifiers during every migration.
- [ ] Add repository tests with an isolated IndexedDB environment.

Exit criteria:

- [ ] Refresh the browser without losing organization data.
- [ ] Upgrade a previous schema fixture without losing identifiers or relationships.

### 1.9 Implement OPFS media storage

- [ ] Detect OPFS availability before accepting local files.
- [ ] Request persistent browser storage after the user creates their first item.
- [ ] Store files under `/media/<mediaSourceId>/<variant>`.
- [ ] Preserve the original file extension only as metadata.
- [ ] Use stable internal filenames such as `original` and `thumbnail.webp`.
- [ ] Stream large files when browser APIs permit streaming.
- [ ] Create object URLs only for active views.
- [ ] Revoke object URLs when their consumers are removed.
- [ ] Delete incomplete files after failed imports.
- [ ] Remove unreferenced files through a controlled maintenance task.
- [ ] Calculate storage usage with `navigator.storage.estimate()`.
- [ ] Display usage, quota, persistence status, and recovery guidance.

Exit criteria:

- [ ] Reload and display stored media without network access.
- [ ] Confirm that deletion removes metadata and media bytes.
- [ ] Confirm that interrupted imports leave no visible partial item.

### 1.10 Complete the local image upload path

- [ ] Add file picker, drag-and-drop, and clipboard image input.
- [ ] Validate MIME type, extension, and size before writing.
- [ ] Read dimensions without retaining the entire decoded image.
- [ ] Create the item, source, media source, original variant, and OPFS location.
- [ ] Generate a bounded WebP thumbnail in the browser.
- [ ] Preserve the original image without recompression.
- [ ] Show per-file progress for batch imports.
- [ ] Support cancellation before metadata commit.
- [ ] Report duplicate candidates using checksum and size.
- [ ] Let the user keep or skip a duplicate candidate.
- [ ] Roll back metadata when the media write fails.
- [ ] Remove media bytes when the metadata transaction fails.

Exit criteria:

- [ ] Import JPEG, PNG, WebP, GIF, and supported HEIC files.
- [ ] Import multiple images and report individual failures.
- [ ] Verify thumbnails, details, reload behavior, and deletion.

### 1.11 Complete local video and website paths

- [ ] Accept only browser-playable video formats for the first release.
- [ ] Store the original local video in OPFS.
- [ ] Read duration, dimensions, and MIME type.
- [ ] Generate a poster frame when browser APIs permit it.
- [ ] Show an explicit state when poster generation fails.
- [ ] Save website URL, title, description, and tags in IndexedDB.
- [ ] Normalize website URLs before persistence.
- [ ] Derive the domain locally.
- [ ] Allow a manual preview image upload for website items.
- [ ] Defer cross-origin metadata extraction to a future backend worker.

Exit criteria:

- [ ] Play a stored video after a browser restart.
- [ ] Create and edit a website item without a network request.

### 1.12 Add local search, sorting, and filtering

- [ ] Search titles, descriptions, domains, collection names, folder names, and tag names.
- [ ] Filter by item type, collection, folder, and tag.
- [ ] Sort by creation time, update time, title, and manual position.
- [ ] Keep search and filter state in the route query.
- [ ] Debounce only operations that have measurable cost.
- [ ] Test Unicode, empty queries, and deleted records.

Exit criteria:

- [ ] Restore a filtered library view from its URL.
- [ ] Return correct results for combined filters.

### 1.13 Add local backup and recovery

- [ ] Export metadata as versioned `library.json`.
- [ ] Export media under stable relative paths in a ZIP archive.
- [ ] Include schema version and checksum metadata.
- [ ] Validate an archive completely before import.
- [ ] Preview import counts and conflicts before mutation.
- [ ] Preserve identifiers when importing into an empty library.
- [ ] Define identifier conflict behavior for nonempty libraries.
- [ ] Test export and import with missing and corrupted media.

Exit criteria:

- [ ] Export a library and restore it in a clean browser profile.
- [ ] Confirm that corrupted archives cannot damage existing data.

### 1.14 Verify the local-first release

- [ ] Add unit tests for domain rules and application services.
- [ ] Add repository tests for IndexedDB and OPFS adapters.
- [ ] Add component tests for upload and organization workflows.
- [ ] Add browser tests for the main local user journey.
- [ ] Test offline use after the application assets are cached.
- [ ] Test quota exhaustion and storage permission denial.
- [ ] Test keyboard access and screen-reader labels.
- [ ] Run formatting, linting, type checks, tests, and production builds.
- [ ] Measure initial load, large-library rendering, and thumbnail decoding.
- [ ] Fix all release-blocking accessibility and data-loss defects.

Phase exit criteria:

- [ ] A guest can organize and recover a useful library without an account.
- [ ] No local item creation requires the Express API.
- [ ] Browser reloads and temporary network loss do not lose committed work.

## Phase 2 — Authentication and account features

### 2.1 Choose the authentication boundary

- [ ] Decide between a managed identity provider and owned credential storage.
- [ ] Document session lifetime, refresh behavior, and supported OAuth providers.
- [ ] Use secure, HTTP-only, same-site cookies for web sessions.
- [ ] Define CSRF protection for cookie-authenticated mutations.
- [ ] Define rate limits for registration, authentication, and recovery.
- [ ] Define account deletion and local-library retention behavior.
- [ ] Keep authentication optional for every local-only workflow.

Exit criteria:

- [ ] Approve a short authentication decision record before implementation.

### 2.2 Build the backend authentication foundation

- [ ] Add configuration validation for authentication secrets and callback URLs.
- [ ] Add user and session persistence required by the selected approach.
- [ ] Implement registration or provider enrollment.
- [ ] Implement authentication and session creation.
- [ ] Implement session refresh and termination.
- [ ] Implement email verification when required.
- [ ] Implement password recovery when credentials are owned.
- [ ] Return generic errors for credential and recovery failures.
- [ ] Add audit events for security-sensitive account actions.
- [ ] Add `GET /api/v1/me`.
- [ ] Return user identity, capabilities, and workspace summary from `/me`.

Exit criteria:

- [ ] Test registration, authentication, refresh, termination, and expired sessions.
- [ ] Test CSRF defenses and authentication rate limits.

### 2.3 Build the web authentication experience

- [ ] Add register, authenticate, verify-email, recovery, and reset screens.
- [ ] Preserve the intended destination across authentication.
- [ ] Add pending, success, validation, and server-error states.
- [ ] Add account controls to the application shell.
- [ ] Add session restoration during application initialization.
- [ ] Keep the existing local workspace available after authentication.
- [ ] Explain that authentication alone does not upload local data.
- [ ] Ask before any future cloud migration begins.

Exit criteria:

- [ ] Authenticate and terminate a session without changing local records.
- [ ] Refresh the page and preserve both session and local-library state.

### 2.4 Add capabilities and account settings

- [ ] Define `cloudStorage`, `cloudSync`, `multiDevice`, and `sharing` capabilities.
- [ ] Resolve capabilities on the server.
- [ ] Return capabilities through `/me`.
- [ ] Render feature access from capabilities instead of plan names.
- [ ] Add profile, session, data export, and account deletion settings.
- [ ] Add a cloud feature prompt for unauthenticated users.
- [ ] Add a separate upgrade state for authenticated users without cloud capability.
- [ ] Verify every protected endpoint independently on the server.

Phase exit criteria:

- [ ] A guest can remain local without authentication prompts during normal use.
- [ ] An authenticated user receives stable identity and capability data.
- [ ] Authentication does not imply cloud persistence or automatic migration.

## Phase 3 — PostgreSQL, R2, and cloud persistence

### 3.1 Establish PostgreSQL infrastructure

- [ ] Select the database client and migration tool.
- [ ] Add validated database configuration to the API application.
- [ ] Create migrations for users, workspaces, members, collections, and folders.
- [ ] Create migrations for sources, media sources, items, and site sources.
- [ ] Create migrations for media variants, media locations, tags, and item tags.
- [ ] Create migrations for uploads and future sync changes.
- [ ] Add foreign keys, uniqueness constraints, soft deletion, and documented indexes.
- [ ] Add transaction helpers for multi-record mutations.
- [ ] Seed development users and workspaces without production credentials.
- [ ] Add migration and rollback checks to continuous integration.

Exit criteria:

- [ ] Recreate the development database entirely from migrations.
- [ ] Verify domain constraints with integration tests.

### 3.2 Implement remote metadata repositories

- [ ] Implement PostgreSQL repositories behind existing application interfaces.
- [ ] Require workspace authorization for every record query.
- [ ] Implement collection and folder mutations.
- [ ] Implement item, source, variant, location, and tag mutations.
- [ ] Implement cursor pagination for item lists.
- [ ] Implement server-side filters matching the local query model.
- [ ] Implement expected-version checks for updates.
- [ ] Return a typed conflict response for stale versions.
- [ ] Never expose database identifiers that differ from domain identifiers.

Exit criteria:

- [ ] Run the same repository contract tests against memory, IndexedDB, and PostgreSQL where applicable.

### 3.3 Establish R2 media storage

- [ ] Add validated R2 account, bucket, and signing configuration.
- [ ] Define opaque object keys from workspace, media source, and variant identifiers.
- [ ] Keep object keys private from UI components.
- [ ] Create short-lived presigned upload URLs.
- [ ] Restrict signed uploads by object key, method, content type, and size.
- [ ] Create an upload record before returning a signed URL.
- [ ] Verify object existence and metadata before completion.
- [ ] Create an available media location only after verification.
- [ ] Expire abandoned upload records.
- [ ] Remove abandoned objects through a controlled maintenance task.
- [ ] Generate short-lived download URLs for private objects.
- [ ] Configure CORS for the exact web origins and required methods.

Exit criteria:

- [ ] Upload directly from the browser without proxying bytes through Express.
- [ ] Reject expired, oversized, incorrectly typed, and incorrectly keyed uploads.

### 3.4 Implement the cloud image vertical slice

- [ ] Add `POST /api/v1/items` for cloud image creation.
- [ ] Authenticate the request.
- [ ] Verify workspace access.
- [ ] Verify the `cloudStorage` capability.
- [ ] Verify storage quota.
- [ ] Validate media metadata.
- [ ] Create item, source, media source, variant, and upload records transactionally.
- [ ] Return the item and presigned R2 upload details.
- [ ] Add `POST /api/v1/uploads/:uploadId/complete`.
- [ ] Add `DELETE /api/v1/uploads/:uploadId`.
- [ ] Display pending, uploading, verifying, available, and failed states.
- [ ] Retry only safe upload and completion operations.

Exit criteria:

- [ ] Create and view a cloud-only image from a clean browser profile.
- [ ] Confirm that failed uploads do not appear as available media.

### 3.5 Add cloud organization and retrieval

- [ ] Add workspace collection, folder, tag, and item endpoints.
- [ ] Add item detail responses with resolved media URLs.
- [ ] Add item movement, duplication, reorder, and deletion endpoints.
- [ ] Add cloud search and filtering.
- [ ] Add storage usage to `GET /api/v1/me/storage`.
- [ ] Apply authentication, workspace access, capability, quota, and validation in that order.
- [ ] Add authorization tests for cross-workspace record identifiers.
- [ ] Add pagination and query-limit tests.

Exit criteria:

- [ ] Complete the main library journey using cloud-only persistence.
- [ ] Confirm that one workspace cannot read or mutate another workspace.

### 3.6 Connect persistence modes

- [ ] Add a `StorageResolver` that selects local, cloud, or both repositories.
- [ ] Allow only local persistence when cloud capability is absent.
- [ ] Treat the client persistence value as a request, not authorization.
- [ ] Keep local creation independent from remote availability in `both` mode.
- [ ] Preserve identical entity identifiers in local and remote records.
- [ ] Show the chosen persistence mode before each import.
- [ ] Persist the default mode as a user preference.
- [ ] Never remove local media when a user changes the default mode.

Exit criteria:

- [ ] Verify local, cloud, and both modes through the same UI workflow.
- [ ] Confirm that remote failure does not reverse a successful local creation in both mode.

### 3.7 Implement initial synchronization

- [ ] Write a local change-log entry for every synchronizable mutation.
- [ ] Track pending, syncing, synced, and error states per entity.
- [ ] Push metadata before media uploads.
- [ ] Add remote media locations only after upload verification.
- [ ] Retry queued work with bounded exponential delay.
- [ ] Pause synchronization when the session or capability is invalid.
- [ ] Resume synchronization after authentication and connectivity recover.
- [ ] Use entity versions for conflict detection.
- [ ] Present conflicts that require user selection.
- [ ] Avoid CRDTs in the first synchronization release.
- [ ] Add an explicit local-to-cloud migration workflow.
- [ ] Preview item counts, media size, and quota before migration.
- [ ] Preserve local media after successful migration.

Exit criteria:

- [ ] Migrate an existing local library to both mode without identifier changes.
- [ ] Recover from interrupted synchronization without duplicate items.
- [ ] Surface unresolved conflicts without silent data replacement.

### 3.8 Add website capture and video processing later

- [ ] Add server-side website metadata extraction after core cloud images are stable.
- [ ] Add an asynchronous hero screenshot worker.
- [ ] Store Open Graph images and screenshots as media sources and variants.
- [ ] Add capture states for pending, processing, ready, partial, and failed.
- [ ] Add remote video processing only after direct R2 uploads are reliable.
- [ ] Choose R2 playback or Cloudflare Stream from measured playback requirements.
- [ ] Add webhook signature verification before processing provider callbacks.
- [ ] Make processing callbacks idempotent.

Exit criteria:

- [ ] Website capture failures never damage the saved URL record.
- [ ] Video processing retries never create duplicate variants or locations.

### 3.9 Verify the cloud release

- [ ] Add API contract tests for every public endpoint.
- [ ] Add database integration tests against a temporary PostgreSQL database.
- [ ] Add R2 adapter tests against a nonproduction bucket or compatible emulator.
- [ ] Add browser tests for cloud-only and both modes.
- [ ] Test session expiry during upload and synchronization.
- [ ] Test quota exhaustion before and during uploads.
- [ ] Test stale versions and network interruption.
- [ ] Test authorization with guessed resource identifiers.
- [ ] Run formatting, linting, type checks, tests, migrations, and production builds.

Phase exit criteria:

- [ ] Cloud media access is private and server-authorized.
- [ ] Direct uploads are verified before records become available.
- [ ] Existing local libraries can migrate without data loss.

## Phase 4 — SwiftUI client

### 4.1 Freeze the client contract

- [ ] Publish an OpenAPI contract for authentication, library, upload, and synchronization endpoints.
- [ ] Define stable error codes, pagination, date formats, and version conflicts.
- [ ] Define an API compatibility policy for web and native clients.
- [ ] Generate or implement a typed Swift API client from the contract.
- [ ] Add contract tests that compare Swift fixtures with API responses.

Exit criteria:

- [ ] Decode every required API response in a small Swift test target.
- [ ] Complete API changes without requiring undocumented client assumptions.

### 4.2 Create the native project foundation

- [ ] Define the minimum iOS and macOS versions.
- [ ] Create the SwiftUI application and test targets.
- [ ] Use Swift concurrency for network and file operations.
- [ ] Isolate UI state on the main actor.
- [ ] Define native domain models that preserve server identifiers.
- [ ] Define repository protocols matching the web application concepts.
- [ ] Add environment configuration for development, staging, and production APIs.
- [ ] Store session secrets in Keychain.

Exit criteria:

- [ ] Build and test the application in continuous integration.
- [ ] Switch environments without source edits.

### 4.3 Implement native local persistence

- [ ] Store structured metadata with SwiftData or a selected SQLite layer.
- [ ] Store media files under Application Support using stable identifiers.
- [ ] Exclude recoverable caches from device backup.
- [ ] Preserve user-owned originals according to the backup policy.
- [ ] Generate native image thumbnails outside the main actor.
- [ ] Generate video posters with AVFoundation.
- [ ] Add repository tests for metadata and file coordination.
- [ ] Add cleanup for interrupted imports and unreferenced files.

Exit criteria:

- [ ] Import and reopen image and video items without network access.
- [ ] Confirm that metadata and files remain consistent after cancellation.

### 4.4 Build the SwiftUI library experience

- [ ] Build adaptive navigation for compact and regular layouts.
- [ ] Build collection and folder navigation.
- [ ] Build item grids, lists, filters, and search.
- [ ] Build image, video, and website item cards.
- [ ] Build item detail and editing screens.
- [ ] Build PhotosPicker, file importer, camera, and share-extension entry points.
- [ ] Add upload progress, cancellation, and recovery states.
- [ ] Add Dynamic Type, VoiceOver, keyboard, and pointer support.
- [ ] Avoid copying web layouts that conflict with native platform conventions.

Exit criteria:

- [ ] Complete the local library journey on phone and tablet simulators.
- [ ] Verify accessibility at large text sizes.

### 4.5 Add native authentication and cloud modes

- [ ] Implement the selected provider flow with secure system authentication surfaces.
- [ ] Restore and refresh sessions securely.
- [ ] Load `/me` and capability data.
- [ ] Keep local use available after session expiry.
- [ ] Implement presigned R2 uploads through the backend API.
- [ ] Never place R2 credentials in the application.
- [ ] Implement cloud-only and both persistence modes.
- [ ] Implement the same synchronization states as the web client.
- [ ] Register each installation as a device when device-aware synchronization exists.
- [ ] Handle background suspension during uploads and synchronization.

Exit criteria:

- [ ] Access the same cloud workspace from web and SwiftUI clients.
- [ ] Interrupt and resume a native upload without duplicate records.

### 4.6 Verify and release the native client

- [ ] Add unit tests for domain, repository, and synchronization behavior.
- [ ] Add UI tests for authentication, imports, navigation, and conflicts.
- [ ] Test offline launch and expired sessions.
- [ ] Test low-storage, denied-permission, and background-interruption states.
- [ ] Test migrations from every released local schema.
- [ ] Measure scrolling, image decoding, memory, launch, and energy use.
- [ ] Complete privacy labels and data-use documentation.
- [ ] Complete TestFlight testing before public release.

Phase exit criteria:

- [ ] The native client preserves local-first behavior.
- [ ] The web and native clients share one remote domain and API contract.
- [ ] Cross-device synchronization preserves identifiers and prevents silent data loss.

## Final release checklist

- [ ] Verify every phase exit criterion.
- [ ] Confirm that guest mode never requires authentication.
- [ ] Confirm that local files have export and recovery paths.
- [ ] Confirm that server authorization protects every cloud resource.
- [ ] Confirm that storage credentials never reach web or native clients.
- [ ] Confirm that all schema and API changes include migration notes.
- [ ] Confirm that observability excludes secrets, tokens, and private media URLs.
- [ ] Publish operational recovery procedures for PostgreSQL and R2.
- [ ] Publish user guidance for local storage limits and cloud migration.
