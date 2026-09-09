# Personal Library Release

This decision defines the first local release.

## Main goals

- [ ] Define the first release around one personal workspace.
- [ ] Support collections, nested folders, tags, and items.
- [ ] Keep the personal workspace internal and hide workspace concepts from the interface.

## Product boundary

The release presents one personal library.

The application keeps one internal workspace record.

The interface does not show workspace names, workspace selectors, or workspace controls.

Users see collections, folders, tags, and items.

The interface provides All and Saved views.

The interface does not provide an Unsorted view.

## Supported content

The first release supports these item types:

- image
- video
- site

The first complete media path supports local images.

Browser-compatible local video follows image support.

Website items accept manually entered URLs.

Automatic website capture remains deferred.

## Organization model

Collections belong to the internal workspace.

Folders belong to one collection.

Folders can contain folders without a fixed nesting limit.

Items can belong to a collection and an optional folder.

Tags belong to the internal workspace.

Items can have multiple tags.

An item can belong to no collection.

The interface does not provide a separate view for those items.

## Saved behavior

`Item.savedAt` stores the last save timestamp.

Saving an item sets `savedAt`.

Unsaving an item clears `savedAt`.

Saving does not move the item.

Saving does not change tags, source data, or media locations.

The Saved view lists non-deleted items with a non-null `savedAt`.

New image, video, and website save flows create saved items.

The save operation is idempotent.

Deleted items use `deletedAt` internally.

Deleted items remain hidden from All and Saved views.

The Deleted tab is deferred.

The future Deleted tab should retain deleted items for a target 30-day period.

The future release should support restoration before retention expires.

The future release may purge expired metadata and media.

The current release has no Deleted tab, restore action, or purge job.

## Initial interface

The library route contains these areas:

1. A compact application header.
2. All and Saved navigation.
3. Collection cards.
4. Nested folder navigation.
5. Item cards with save controls.
6. Tag badges.

Collection and folder actions use menus and dialogs.

The first interface uses a responsive grid.

The first interface does not require a polished masonry layout.

## Deferred features

- user-facing workspace management
- workspace switching
- collaboration and sharing
- authentication requirements
- cloud storage
- cloud synchronization
- billing
- semantic search
- automatic website capture
- OCR and image embeddings
- additional item types
- Deleted tab and deleted-item restoration
- 30-day deleted-item retention and purge jobs

## Implementation sequence

1. Add domain types and validation under `packages/domain`.
2. Add repository interfaces and in-memory implementations.
3. Add collection, folder, tag, item, and save application operations.
4. Add the library shell with fixture data.
5. Add the All and Saved views.
6. Add organization dialogs and item save controls.
7. Add IndexedDB metadata persistence.
8. Add OPFS media persistence for images.

The UI must depend on application services.

The UI must not call IndexedDB, OPFS, or the Express API directly.

## Acceptance criteria

- The interface never displays workspace information.
- The library displays collections and nested folders.
- Items display their collection, folder, tags, and save state.
- Save and unsave operations preserve item placement.
- The Saved view excludes unsaved and deleted items.
- The current release has no Deleted tab or retention job.
- Collection and folder relationships reject invalid parents.
- Tags work across collections and folders.
- Reload preserves all committed data after IndexedDB integration.
- Local item creation works without the Express API.
- Keyboard users can access all save and organization actions.
