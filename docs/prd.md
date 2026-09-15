# Design Inspiration Library — Project Brief & Architecture

## 1. Project Brief

### Overview

This project is a local-first design inspiration library that helps users organize visual references, websites, images, videos, typography ideas, color palettes, and other design-related material.

The product should work well for users who want a private personal library while also supporting paid cloud backup and multi-device synchronization.

The core product model is:

```text
Workspace
└── Collection
    └── Folder
        └── Item
            └── Source
                ├── SiteSource
                └── MediaSource
                    └── MediaLocation
                        ├── OPFS
                        ├── R2
                        └── Cloudflare Stream
```

### Product Positioning

The product is local-first.

Free users can store their library locally in the browser.

```text
Metadata
→ IndexedDB

Images / videos / files
→ OPFS
```

Pro users can choose where new items are persisted:

```text
local
cloud
both
```

Cloud storage uses:

```text
Metadata
→ PostgreSQL

Images / files
→ Cloudflare R2

Videos
→ Cloudflare Stream or R2 depending on playback requirements
```

The frontend should use the same domain API regardless of persistence mode.

Example:

```ts
createItem('image', {
  collectionId,
  file,
  persistence: 'local',
});
```

or:

```ts
createItem('image', {
  collectionId,
  file,
  persistence: 'cloud',
});
```

or:

```ts
createItem('image', {
  collectionId,
  file,
  persistence: 'both',
});
```

The backend must never trust the persistence choice as authorization. Cloud permissions and storage quotas must always be checked server-side.

---

## 2. Project Features

### Core Organization

Users can organize inspiration with:

- Workspaces
- Collections
- Folders
- Nested folders
- Items
- Tags

Example:

```text
Workspace: Personal

Collection: Sites
├── SaaS
├── E-commerce
└── Portfolio

Collection: Typography
├── Serif
├── Sans Serif
└── Display
```

### Item Types

Initial item types:

```text
image
video
site
```

Possible future types:

```text
color_palette
font
pdf
note
component
snippet
figma
youtube
vimeo
```

### Image Items

Users can:

- Upload images
- Store images locally in OPFS
- Store images remotely in R2
- Keep both local and cloud copies
- Generate thumbnails
- Attach tags
- Move images between collections/folders

### Video Items

Local mode:

```text
Browser
→ OPFS
→ normal browser video playback
```

Remote mode:

```text
Browser
→ Cloudflare Stream
```

Cloudflare Stream is preferred when adaptive playback, transcoding, poster frames, HLS, and large-video handling are important.

R2 can still be used for raw video storage if direct MP4 playback is sufficient.

### Website Items

A saved website should be represented as a source, not as a file.

Example:

```text
Item
└── Source
    └── SiteSource
        ├── URL
        ├── domain
        ├── title
        ├── description
        ├── favicon
        ├── Open Graph metadata
        └── screenshot
```

Generated screenshots can be stored as media assets.

### Tagging

Tags provide cross-folder classification.

Example:

```text
Item
Stripe homepage

Collection
Sites

Folder
SaaS

Tags
minimal
dark
hero
gradient
```

### Saved Items

Saved items are the user's explicit bookmarks inside the library.

Saving an item sets `savedAt` to the current timestamp.

Unsaving an item clears `savedAt`.

Saving does not change the item's collection, folder, tags, or source.

The Saved view lists every non-deleted item with a non-null `savedAt` value.

New items created through an import or website-save flow start as saved.

The save action is idempotent.

The first release does not expose an Unsorted view.

The first release does not expose workspace names or workspace controls.

The application uses one internal personal workspace until workspace features become user-facing.

### Deleted Items

Deleted items use the existing `deletedAt` field.

Deleted items remain excluded from All and Saved views.

A future release may add a Deleted tab.

The future Deleted tab should list deleted items during a target 30-day retention period.

The future release should support restoring an item before retention expires.

After retention expires, a scheduled purge may remove metadata and media permanently.

The first release does not provide the Deleted tab, restore actions, or purge jobs.

### Search

Search should eventually support:

- Item title
- Description
- Tags
- Website domain
- Website title
- Item type
- Collection
- Folder
- Saved status

Possible future search:

- OCR
- Semantic search
- Image embeddings
- AI-generated labels

### Local Storage

Free users can store media locally.

```text
IndexedDB
├── collections
├── folders
├── items
├── sources
├── tags
└── sync metadata

OPFS
├── images
├── videos
├── screenshots
└── thumbnails
```

The application should expose storage usage using:

```ts
navigator.storage.estimate();
```

The application should also request persistent storage where appropriate:

```ts
navigator.storage.persist();
```

Local storage should not be presented as guaranteed backup.

### Cloud Storage

Remote storage:

```text
PostgreSQL
→ metadata

R2
→ images
→ screenshots
→ PDFs
→ other files

Cloudflare Stream
→ videos
```

### Export

Free users should be able to export their local library.

Example:

```text
design-library.zip
├── library.json
└── media/
    ├── image-1.webp
    ├── image-2.png
    └── video-1.mp4
```

This provides a recovery path without requiring a subscription.

---

## 3. Login / Register Flow

### Authentication Goals

Authentication is only required for cloud-related functionality.

A user should be able to use local mode without logging in.

Suggested behavior:

```text
New visitor
    │
    ▼
Use app locally
    │
    ├── create collections
    ├── create folders
    ├── save images
    ├── save videos
    └── save sites
```

When the user wants:

```text
cloud backup
multi-device sync
cloud-only storage
sharing
```

the application asks them to register or log in.

### Register Flow

```text
User selects "Enable Cloud Backup"
        │
        ▼
Not authenticated?
        │
        ▼
Register
        │
        ├── email/password
        └── OAuth provider
        │
        ▼
Verify email if required
        │
        ▼
Create user
        │
        ▼
Create personal workspace
        │
        ▼
Load entitlements
        │
        ▼
Show upgrade flow if cloud feature requires Pro
```

Suggested endpoints:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
```

If using an external authentication provider such as Auth0, Clerk, or Supabase Auth, most authentication endpoints can be handled by the provider.

### Login Flow

```text
Login
  │
  ▼
Backend validates credentials/token
  │
  ▼
Session established
  │
  ▼
GET /api/v1/me
  │
  ▼
Return:
- user
- plan
- capabilities
- workspace
```

Example:

```json
{
  "id": "user_123",
  "email": "hello@example.com",
  "plan": "pro",
  "capabilities": {
    "cloudStorage": true,
    "cloudSync": true,
    "multiDevice": true
  }
}
```

### Entitlements

Do not scatter plan-name checks throughout the frontend or backend.

Avoid:

```ts
if (user.plan === 'pro') {
  // ...
}
```

Prefer capabilities:

```ts
interface UserCapabilities {
  cloudStorage: boolean;
  cloudSync: boolean;
  multiDevice: boolean;
  sharing: boolean;
}
```

Example plan mapping:

```ts
const PLAN_CAPABILITIES = {
  free: {
    cloudStorage: false,
    cloudSync: false,
    multiDevice: false,
    sharing: false,
  },

  pro: {
    cloudStorage: true,
    cloudSync: true,
    multiDevice: true,
    sharing: true,
  },
};
```

The frontend uses capabilities for UI decisions.

The backend independently verifies capabilities for authorization.

---

## 4. Sync Feature and Logic

### Persistence Modes

The frontend API accepts:

```ts
type PersistenceMode = 'local' | 'cloud' | 'both';
```

Examples:

```ts
createItem('image', {
  collectionId,
  file,
  persistence: 'local',
});
```

```ts
createItem('image', {
  collectionId,
  file,
  persistence: 'cloud',
});
```

```ts
createItem('image', {
  collectionId,
  file,
  persistence: 'both',
});
```

### Free User

Free users are limited to:

```text
local
```

Storage:

```text
Metadata
→ IndexedDB

Media
→ OPFS
```

There is no backend request for local-only item creation.

### Pro User

Pro users can choose:

```text
local
cloud
both
```

#### Local

```text
createItem
   │
   ├── IndexedDB
   └── OPFS
```

#### Cloud

```text
createItem
   │
   ▼
Backend API
   │
   ├── permission check
   ├── entitlement check
   ├── quota check
   └── Postgres
        │
        ▼
   presigned R2 upload
```

No permanent OPFS copy is required.

#### Both

```text
createItem
   │
   ▼
Local creation
   ├── IndexedDB
   └── OPFS
   │
   ▼
Sync queue
   │
   ▼
Backend
   ├── Postgres
   └── R2 / Stream
```

For `both`, local creation should succeed even if cloud synchronization temporarily fails.

### Sync State

Suggested sync state:

```ts
type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';
```

Example local record:

```ts
interface SyncState {
  entityType: 'item' | 'collection' | 'folder' | 'tag';
  entityId: string;
  status: SyncStatus;
  lastSyncedAt?: string;
}
```

### Change Log

Every local mutation that may eventually sync should create a change-log record.

Example:

```ts
interface Change {
  id: string;
  entityType: 'item' | 'collection' | 'folder' | 'tag';
  entityId: string;

  operation: 'create' | 'update' | 'delete';

  createdAt: number;
}
```

Example flow:

```text
createItem
   │
   ▼
Write IndexedDB
   │
   ▼
Write OPFS
   │
   ▼
Write Change Log
   │
   ▼
Sync Engine
   │
   ├── cloudSync enabled?
   │       │
   │       ├── no → stop
   │       └── yes
   │
   ▼
Push remote
```

### Client-Generated IDs

Use UUIDv7 or UUIDv4.

Do not depend on server-generated sequential IDs.

Example:

```text
Local
item_id = 019...

Remote
item_id = 019...
```

The same logical item should keep the same identifier across local and remote storage.

### Media Identity vs Location

Separate logical media from physical storage.

```text
MediaSource
   │
   ├── MediaLocation
   │    provider = opfs
   │
   └── MediaLocation
        provider = r2
```

Suggested model:

```ts
interface MediaSource {
  sourceId: string;
  mediaType: 'image' | 'video';
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  checksum?: string;
}
```

```ts
interface MediaLocation {
  id: string;
  sourceId: string;

  provider: 'opfs' | 'r2' | 'cloudflare_stream';

  locator: string;

  status: 'pending' | 'available' | 'failed';
}
```

### Upgrade Flow

When a local-only user upgrades:

```text
Local library
    │
    ▼
Scan unsynced entities
    │
    ▼
Push metadata
    │
    ▼
Upload media
    │
    ▼
Add remote MediaLocation
    │
    ▼
Mark synced
```

The local media copy can remain after backup.

### Switching to Cloud-Only

Do not automatically delete local files when a user switches from `both` to `cloud`.

A safer model is:

```ts
type LocalCachePolicy = 'keep' | 'remove_after_upload';
```

Deletion should be explicit or controlled by a separate storage-management flow.

### Conflict Handling

Initial strategy:

```text
entity
├── version
└── updated_at
```

Updates include the expected version.

Example:

```json
{
  "expectedVersion": 7,
  "title": "Updated title"
}
```

If server version is already 8, return a conflict.

CRDTs are not necessary for the first version.

---

## 5. Frontend Structure

### High-Level Structure

```text
Frontend
│
├── UI
│
├── Application / Domain Services
│
├── Local Persistence
│   ├── IndexedDB
│   └── OPFS
│
├── Remote API Client
│
└── Sync Engine
```

Suggested folder structure:

```text
src/
├── domain/
│   ├── collection.ts
│   ├── folder.ts
│   ├── item.ts
│   ├── source.ts
│   ├── media.ts
│   └── tag.ts
│
├── application/
│   ├── createCollection.ts
│   ├── createFolder.ts
│   ├── createItem.ts
│   ├── updateItem.ts
│   ├── deleteItem.ts
│   └── sync/
│       ├── SyncEngine.ts
│       ├── SyncQueue.ts
│       └── ChangeLog.ts
│
├── infrastructure/
│   ├── local/
│   │   ├── indexed-db.ts
│   │   ├── opfs.ts
│   │   ├── LocalMetadataRepository.ts
│   │   └── LocalMediaRepository.ts
│   │
│   └── remote/
│       ├── api-client.ts
│       ├── RemoteMetadataRepository.ts
│       └── RemoteMediaRepository.ts
│
├── services/
│   ├── AuthService.ts
│   ├── EntitlementService.ts
│   ├── PreferenceService.ts
│   └── StorageResolver.ts
│
└── ui/
    ├── collections/
    ├── folders/
    ├── items/
    ├── tags/
    ├── settings/
    └── auth/
```

### Public Application API

The UI should call high-level functions.

Example:

```ts
createCollection({
  name: 'Typography',
  persistence: 'local',
});
```

Example:

```ts
createItem('image', {
  collectionId,
  folderId,
  file,
  title: 'Editorial typography',
  persistence: 'both',
});
```

Example:

```ts
saveItem(itemId);
unsaveItem(itemId);
```

### createCollection

Example:

```ts
async function createCollection(input: {
  name: string;
  persistence: PersistenceMode;
}) {
  const collection = {
    id: createId(),
    name: input.name,
    createdAt: new Date().toISOString(),
  };

  if (input.persistence === 'local' || input.persistence === 'both') {
    await localMetadata.collections.put(collection);
  }

  if (input.persistence === 'cloud' || input.persistence === 'both') {
    await remoteMetadata.collections.create(collection);
  }

  return collection;
}
```

For future offline support, `both` should preferably write locally first and then queue remote synchronization.

### createItem("image")

Example:

```ts
async function createItem(
  type: 'image',
  input: {
    collectionId: string;
    folderId?: string;
    file: File;
    title?: string;
    persistence: PersistenceMode;
  },
) {
  const itemId = createId();
  const sourceId = createId();

  const item = {
    id: itemId,
    sourceId,
    collectionId: input.collectionId,
    folderId: input.folderId ?? null,
    type,
    title: input.title ?? null,
    createdAt: new Date().toISOString(),
  };

  if (input.persistence === 'local' || input.persistence === 'both') {
    await localMedia.createImage({
      item,
      sourceId,
      file: input.file,
    });
  }

  if (input.persistence === 'cloud' || input.persistence === 'both') {
    try {
      await remoteMedia.createImage({
        item,
        sourceId,
        file: input.file,
      });
    } catch (error) {
      if (input.persistence === 'both') {
        await syncQueue.add({
          entityType: 'item',
          entityId: item.id,
        });
      } else {
        throw error;
      }
    }
  }

  return item;
}
```

### IndexedDB Responsibilities

IndexedDB stores structured metadata.

Suggested stores:

```text
collections
folders
items
sources
mediaSources
mediaLocations
tags
itemTags
syncStates
changeLog
preferences
```

### OPFS Responsibilities

OPFS stores file bytes.

Suggested layout:

```text
/media/
  /<sourceId>/
    original
    thumbnail.webp
```

Example:

```text
/media/source_123/original
/media/source_123/thumbnail.webp
```

### Remote API Responsibilities

The remote frontend adapter should never expose Postgres/R2 details directly to UI components.

UI:

```text
createItem()
```

Remote adapter:

```text
POST /items
PUT signed R2 URL
POST /uploads/:id/complete
```

---

## 6. Backend Endpoints

Base path:

```text
/api/v1
```

### Authentication

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh

POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
```

If an external authentication service is used, some or all of these endpoints may be replaced by the provider.

### Current User

```http
GET    /api/v1/me
GET    /api/v1/me/storage
```

Example `/me` response:

```json
{
  "id": "user_123",
  "email": "hello@example.com",
  "plan": "pro",
  "capabilities": {
    "cloudStorage": true,
    "cloudSync": true,
    "multiDevice": true
  }
}
```

### Workspaces

```http
GET    /api/v1/workspaces
POST   /api/v1/workspaces

GET    /api/v1/workspaces/:workspaceId
PATCH  /api/v1/workspaces/:workspaceId
DELETE /api/v1/workspaces/:workspaceId
```

### Collections

```http
GET    /api/v1/workspaces/:workspaceId/collections
POST   /api/v1/workspaces/:workspaceId/collections

GET    /api/v1/collections/:collectionId
PATCH  /api/v1/collections/:collectionId
DELETE /api/v1/collections/:collectionId
```

### Folders

```http
GET    /api/v1/workspaces/:workspaceId/folders
POST   /api/v1/workspaces/:workspaceId/folders

GET    /api/v1/folders/:folderId
PATCH  /api/v1/folders/:folderId
DELETE /api/v1/folders/:folderId
```

Possible folder payload:

```json
{
  "name": "Serif",
  "collectionId": "collection_123",
  "parentId": null
}
```

### Items

```http
GET    /api/v1/items
POST   /api/v1/items

GET    /api/v1/items/:itemId
PATCH  /api/v1/items/:itemId
DELETE /api/v1/items/:itemId

POST   /api/v1/items/:itemId/move
POST   /api/v1/items/:itemId/duplicate
POST   /api/v1/items/reorder
POST   /api/v1/items/:itemId/save
DELETE /api/v1/items/:itemId/save
```

Example filters:

```http
GET /api/v1/items
  ?workspaceId=ws_123
  &collectionId=collection_123
  &folderId=folder_123
  &type=image
  &tagId=tag_123
  &saved=true
  &cursor=...
  &limit=50
```

Use cursor pagination.

### Create Image Item

```http
POST /api/v1/items
```

Example request:

```json
{
  "id": "item_123",
  "workspaceId": "ws_123",
  "collectionId": "collection_123",
  "folderId": "folder_123",
  "type": "image",
  "title": "Typography reference",

  "source": {
    "id": "source_123",
    "filename": "type.png",
    "mimeType": "image/png",
    "sizeBytes": 1820392
  }
}
```

Backend processing:

```text
Authenticate
    │
    ▼
Check workspace permission
    │
    ▼
Check cloud-storage entitlement
    │
    ▼
Check user quota
    │
    ▼
Validate file metadata
    │
    ▼
Create Postgres records
    │
    ▼
Create presigned R2 upload URL
    │
    ▼
Return upload session
```

Example response:

```json
{
  "item": {
    "id": "item_123",
    "sourceId": "source_123",
    "type": "image"
  },

  "upload": {
    "id": "upload_123",
    "provider": "r2",
    "method": "PUT",
    "url": "https://...",
    "expiresAt": "..."
  }
}
```

### Upload Lifecycle

```http
POST   /api/v1/uploads/:uploadId/complete
DELETE /api/v1/uploads/:uploadId
```

Flow:

```text
POST /items
    │
    ▼
Receive signed URL
    │
    ▼
Browser PUT → R2
    │
    ▼
POST /uploads/:uploadId/complete
```

The backend should verify the object exists before marking the media location as available.

### Tags

```http
GET    /api/v1/workspaces/:workspaceId/tags
POST   /api/v1/workspaces/:workspaceId/tags

GET    /api/v1/tags/:tagId
PATCH  /api/v1/tags/:tagId
DELETE /api/v1/tags/:tagId
```

Optional relationship endpoints:

```http
POST   /api/v1/items/:itemId/tags/:tagId
DELETE /api/v1/items/:itemId/tags/:tagId
```

Alternatively, tags may be updated through:

```http
PATCH /api/v1/items/:itemId
```

### Website Sources

```http
POST /api/v1/sites/preview
POST /api/v1/sites/:sourceId/refresh
```

Preview request:

```json
{
  "url": "https://linear.app"
}
```

Possible preview response:

```json
{
  "url": "https://linear.app",
  "domain": "linear.app",
  "title": "Linear",
  "description": "...",
  "favicon": "...",
  "ogImage": "..."
}
```

### Search

```http
GET /api/v1/search
```

Example:

```http
GET /api/v1/search
  ?workspaceId=ws_123
  &q=typography
  &type=image
  &tags=minimal,serif
```

### Sync — Future

These endpoints do not need to be implemented in the first local version.

```http
GET  /api/v1/sync/changes
POST /api/v1/sync/push
```

Example:

```http
GET /api/v1/sync/changes?after=892
```

Possible response:

```json
{
  "cursor": 910,
  "changes": [
    {
      "version": 893,
      "entity": "item",
      "operation": "update",
      "id": "item_123"
    }
  ]
}
```

### Billing — Future

```http
GET    /api/v1/billing/subscription
POST   /api/v1/billing/checkout
POST   /api/v1/billing/portal

POST   /api/v1/webhooks/stripe
```

### Backend Authorization Pipeline

Every protected cloud mutation should follow this general pipeline:

```text
Request
  │
  ▼
Authentication
"Who is the user?"
  │
  ▼
Resource authorization
"Can they modify this workspace?"
  │
  ▼
Entitlement
"Does their plan allow this feature?"
  │
  ▼
Quota
"Do they have enough storage?"
  │
  ▼
Validation
"Is the request valid?"
  │
  ▼
Perform operation
```

Example cloud image creation:

```text
POST /items
    │
    ▼
Authenticated?
    │
    ▼
Can create in workspace?
    │
    ▼
cloud_storage capability?
    │
    ▼
Enough storage quota?
    │
    ▼
Allowed MIME type / size?
    │
    ▼
Postgres transaction
    │
    ▼
Return R2 upload session
```

The client may request cloud persistence, but the backend always makes the final authorization decision.

---

## Recommended Initial Architecture

```text
                           FRONTEND

                     createItem()
                          │
                    persistence
                 local/cloud/both
                          │
              ┌───────────┴───────────┐
              ▼                       ▼

           LOCAL                    REMOTE

       IndexedDB                  Backend API
           │                          │
           │                    Authentication
           │                          │
          OPFS                  Workspace ACL
                                      │
                                 Entitlement
                                      │
                                    Quota
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                    PostgreSQL                    R2
                                                / \
                                           images files

                                      Cloudflare Stream
                                           videos
```

### Core Architectural Rules

1. `Item` represents what the user organizes.
2. `Source` represents the original content.
3. `MediaSource` represents logical media metadata.
4. `MediaLocation` represents where the bytes physically exist.
5. IndexedDB stores local structured metadata.
6. OPFS stores local media bytes.
7. PostgreSQL stores remote structured metadata.
8. R2 stores remote image/file bytes.
9. Cloudflare Stream is optional for remote video delivery.
10. Client-side permission checks are UX only.
11. Server-side permission checks are mandatory.
12. Local and remote copies should use the same entity IDs.
13. `local`, `cloud`, and `both` are persistence choices, not authorization.
14. Sync should be designed as a separate system rather than embedded deeply into every persistence implementation.

---

## 7. Website Capture and Detail Experience

### Website Save Flow

When a user saves a website, the application should preserve both the original URL metadata and visual previews.

The initial capture pipeline should be:

```text
User submits URL
    │
    ▼
Create Item
    │
    ▼
Create SiteSource
    │
    ├── fetch HTML metadata
    │   ├── title
    │   ├── description
    │   ├── canonical URL
    │   ├── domain
    │   ├── favicon
    │   └── Open Graph image
    │
    ├── capture hero screenshot
    │
    └── create media records for generated assets
```

A site item should therefore contain a logical `SiteSource` plus generated media assets.

```text
Item
└── Source
    └── SiteSource
        ├── url
        ├── title
        ├── description
        ├── domain
        ├── favicon
        ├── Open Graph metadata
        ├── Open Graph image
        └── hero screenshot
```

The Open Graph image and hero screenshot should be treated as media assets, not just URL strings.

```text
SiteSource
├── OG Image
│   └── MediaSource
│       └── MediaVariant: original
│           └── MediaLocation
│               └── OPFS / R2
│
└── Hero Screenshot
    └── MediaSource
        ├── MediaVariant: original
        │   └── MediaLocation
        └── MediaVariant: thumbnail
            └── MediaLocation
```

### Hero Screenshot

The hero screenshot should represent the initial visible viewport of the website. A reasonable default capture viewport is around `1440 × 900`, but this can remain configurable.

Suggested capture behavior:

1. Open the target page in a browser-automation worker.
2. Wait for a reasonable ready state.
3. Capture the initial viewport.
4. Store the screenshot as a logical image `MediaSource`.
5. Generate a smaller thumbnail variant when needed.
6. Associate the screenshot media with the `SiteSource`.

The screenshot worker should run asynchronously because capture can be slow or fail for some websites.

```ts
type SiteCaptureStatus =
  'pending' | 'processing' | 'ready' | 'partial' | 'failed';
```

`partial` means that some capture work succeeded while another part failed, such as metadata succeeding but the screenshot failing.

### Thumbnail Selection

A site item initially has two main thumbnail candidates:

```text
Open Graph image
Hero screenshot
```

Possible future choices include:

```text
custom uploaded image
mobile screenshot
full-page screenshot
```

The user's selected thumbnail should be stored explicitly on the item:

```text
items.thumbnail_media_source_id
```

Example:

```text
item_123
thumbnail_media_source_id = media_og_456
```

The user can later switch to:

```text
item_123
thumbnail_media_source_id = media_hero_789
```

Changing the thumbnail does not regenerate or duplicate the underlying media.

### Website Item Detail Page

Clicking a site item should open a detail page, for example:

```text
/items/:itemId
```

The page should show at least:

- Title
- Original URL
- Domain
- Description
- Tags
- Collection
- Folder
- Selected thumbnail
- Open Graph image
- Hero screenshot
- Embedded website when allowed
- Created date
- Updated date

Example layout:

```text
┌──────────────────────────────────────────────┐
│ Linear                                       │
│ https://linear.app                          │
│ product  minimal  saas                      │
│                                              │
│ [OG Image] [Hero Screenshot] [Use thumbnail]│
├──────────────────────────────────────────────┤
│                                              │
│                Embedded Site                 │
│                                              │
├──────────────────────────────────────────────┤
│ Description                                  │
│ Source metadata                              │
│ Created / updated dates                      │
└──────────────────────────────────────────────┘
```

### Embedded Website

The detail page may attempt to embed the original website with an iframe:

```html
<iframe src="https://example.com" />
```

Embedding must be optional. Many websites prevent iframe embedding through `X-Frame-Options` or Content Security Policy `frame-ancestors` rules.

Recommended behavior:

```text
Can embed?
   │
   ├── yes
   │    └── show live iframe
   │
   └── no
        ├── show hero screenshot
        └── show "Open original site"
```

The application should never depend on the iframe being available for the core site-detail experience.

### Refresh Website Metadata

Users should be able to refresh website data later.

```http
POST /api/v1/sites/:sourceId/refresh
```

A refresh may update:

- Title
- Description
- Canonical URL
- Favicon
- Open Graph metadata
- Open Graph image
- Hero screenshot

The selected thumbnail should remain unchanged unless that media no longer exists.

---

## 8. Video Processing

### Video Save Flow

A saved video should be represented by one logical `MediaSource` and multiple generated variants.

```text
Original upload
    │
    ▼
MediaSource
    │
    ├── MediaVariant: original
    ├── MediaVariant: thumbnail
    └── MediaVariant: playback
```

The two user-facing outputs required for V1 are:

```text
thumbnail / preview representation
normal playback representation
```

Keeping an `original` variant as well is useful even if it is not always retained remotely.

### Thumbnail / Preview Version

Folder grids and item lists should not load the full video.

The preview representation can eventually be:

```text
static poster frame
short muted MP4/WebM preview
animated preview
```

Recommended V1:

```text
static WebP/JPEG poster
```

A poster is inexpensive to load and works well for a dense inspiration grid.

Suggested generation flow:

```text
video
  │
  ▼
extract representative frame
  │
  ▼
resize
  │
  ▼
WebP thumbnail
```

A size such as `320 × 180` or `480 × 270` is sufficient for most card UIs.

### Normal Playback Version

The normal playback variant should be optimized for viewing rather than preserving the exact source upload.

A self-managed processing pipeline could produce something like:

```text
MP4
H.264 video
AAC audio
max 1080p
reasonable bitrate
```

If Cloudflare Stream is used remotely, the application can delegate playback transcoding and adaptive delivery to Stream instead of managing these output details itself.

For local OPFS mode, V1 can use the original video for playback when the browser supports its format, while still modeling `playback` as a variant for future processing.

### Media Variant Model

```ts
type MediaVariantKind = 'original' | 'thumbnail' | 'playback';
```

Each variant can have one or more locations:

```text
MediaSource
└── MediaVariant
    └── MediaLocation
        ├── OPFS
        ├── R2
        └── Cloudflare Stream
```

This supports different persistence modes without changing the logical video identity.

Free local user:

```text
original  → OPFS
thumbnail → OPFS
playback  → OPFS
```

Pro cloud user:

```text
original  → R2 (optional)
thumbnail → R2
playback  → Cloudflare Stream
```

### Processing Status

```ts
type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed';
```

An item may exist before all variants are ready.

Example UI state:

```text
Video card
Processing preview…
```

Once the thumbnail is available, the normal card UI can be displayed even if the playback representation is still processing.

### Local Video Processing

The first local browser version should not depend on expensive client-side transcoding.

Recommended V1:

```text
original video → OPFS
thumbnail      → generate locally if practical
playback       → original file when browser-compatible
```

Possible future local-processing technologies include WebCodecs or FFmpeg compiled to WebAssembly.

### Remote Video Processing

```text
Browser
   │
   ▼
Create video item
   │
   ▼
Backend permission + quota checks
   │
   ▼
Direct upload
   │
   ▼
Cloudflare Stream / processing service
   │
   ├── playback output
   └── thumbnail/poster
   │
   ▼
Webhook
   │
   ▼
Update MediaVariant / MediaLocation state
```

---

## 9. Database Model

### Modeling Principles

The database should keep organization, source identity, media representations, and physical storage separate.

```text
Item
= something the user organizes

Source
= what the item represents

MediaSource
= logical image/video/file identity

MediaVariant
= one representation of that media

MediaLocation
= where that variant physically exists
```

### Relationship Overview

```text
User
 │
 └── Workspace
      │
      ├── WorkspaceMember
      ├── Collection
      │    └── Folder
      ├── Tag
      │
      └── Item
           │
           ├── ItemTag
           ├── thumbnail_media_source_id
           │
           └── Source
                │
                ├── SiteSource
                │    ├── og_image_media_source_id
                │    └── hero_media_source_id
                │
                └── MediaSource
                     │
                     └── MediaVariant
                          │
                          └── MediaLocation
```

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,

  plan TEXT NOT NULL DEFAULT 'free',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The plan should not be the only authorization primitive. Backend services should resolve capabilities/entitlements from the user's subscription and account state.

### workspaces

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),

  name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner
ON workspaces(owner_id);
```

### workspace_members

Useful once collaboration is introduced.

```sql
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),

  role TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (workspace_id, user_id)
);
```

Possible roles:

```text
owner
admin
editor
viewer
```

### collections

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  name TEXT NOT NULL,
  position TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_collections_workspace
ON collections(workspace_id);
```

### folders

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  collection_id UUID REFERENCES collections(id),
  parent_id UUID REFERENCES folders(id),

  name TEXT NOT NULL,
  position TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_folders_workspace
ON folders(workspace_id);

CREATE INDEX idx_folders_collection
ON folders(collection_id);

CREATE INDEX idx_folders_parent
ON folders(parent_id);
```

### sources

`Source` is the common identity that lets an `Item` point to either a website or media without item-type-specific join tables.

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  kind TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

Initial `kind` values:

```text
site
media
```

### media_sources

This table stores the logical identity and shared metadata of an image/video/file.

```sql
CREATE TABLE media_sources (
  source_id UUID PRIMARY KEY REFERENCES sources(id),

  media_type TEXT NOT NULL,

  original_filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,

  width INTEGER,
  height INTEGER,
  duration_seconds DOUBLE PRECISION,

  checksum_sha256 TEXT,

  processing_status TEXT NOT NULL DEFAULT 'ready',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Possible `media_type` values:

```text
image
video
audio
pdf
file
```

### items

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  collection_id UUID REFERENCES collections(id),
  folder_id UUID REFERENCES folders(id),
  source_id UUID REFERENCES sources(id),

  type TEXT NOT NULL,

  title TEXT,
  description TEXT,

  saved_at TIMESTAMPTZ,

  thumbnail_media_source_id UUID REFERENCES media_sources(source_id),

  position TEXT,
  version BIGINT NOT NULL DEFAULT 1,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_items_workspace
ON items(workspace_id);

CREATE INDEX idx_items_collection
ON items(collection_id);

CREATE INDEX idx_items_folder
ON items(folder_id);

CREATE INDEX idx_items_source
ON items(source_id);

CREATE INDEX idx_items_type
ON items(type);

CREATE INDEX idx_items_saved_at
ON items(saved_at);
```

For a site item, `thumbnail_media_source_id` can point to the Open Graph image or the hero screenshot.

For a video item, it can point to the logical video media source, while the UI resolves its `thumbnail` media variant.

### site_sources

```sql
CREATE TABLE site_sources (
  source_id UUID PRIMARY KEY REFERENCES sources(id),

  url TEXT NOT NULL,
  canonical_url TEXT,
  domain TEXT NOT NULL,

  title TEXT,
  description TEXT,

  favicon_url TEXT,

  og_title TEXT,
  og_description TEXT,
  og_url TEXT,

  og_image_media_source_id UUID REFERENCES media_sources(source_id),
  hero_media_source_id UUID REFERENCES media_sources(source_id),

  embed_status TEXT NOT NULL DEFAULT 'unknown',
  capture_status TEXT NOT NULL DEFAULT 'pending',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  last_fetched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Suggested `embed_status`:

```text
unknown
allowed
blocked
failed
```

Suggested `capture_status`:

```text
pending
processing
ready
partial
failed
```

### media_variants

A logical media source can have multiple representations.

```sql
CREATE TABLE media_variants (
  id UUID PRIMARY KEY,
  media_source_id UUID NOT NULL
    REFERENCES media_sources(source_id),

  kind TEXT NOT NULL,

  mime_type TEXT,

  width INTEGER,
  height INTEGER,
  duration_seconds DOUBLE PRECISION,
  size_bytes BIGINT,

  processing_status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (media_source_id, kind)
);

CREATE INDEX idx_media_variants_source
ON media_variants(media_source_id);
```

Possible variant kinds:

```text
original
thumbnail
playback
poster
```

Typical image:

```text
original
thumbnail
```

Typical video:

```text
original
thumbnail
playback
```

### devices

Needed for local copies once device-aware synchronization is implemented.

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),

  name TEXT,
  platform TEXT,

  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_user
ON devices(user_id);
```

### media_locations

`MediaLocation` describes where a particular media variant physically exists.

```sql
CREATE TABLE media_locations (
  id UUID PRIMARY KEY,

  media_variant_id UUID NOT NULL
    REFERENCES media_variants(id),

  provider TEXT NOT NULL,
  device_id UUID REFERENCES devices(id),

  locator TEXT NOT NULL,
  provider_id TEXT,

  status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (
    media_variant_id,
    provider,
    device_id
  )
);

CREATE INDEX idx_media_locations_variant
ON media_locations(media_variant_id);

CREATE INDEX idx_media_locations_provider
ON media_locations(provider);
```

Possible providers:

```text
opfs
filesystem
r2
cloudflare_stream
```

Example local image:

```text
MediaSource: image_123
└── Variant: original
    └── Location
        provider = opfs
        locator = media/image_123/original
```

Example cloud video:

```text
MediaSource: video_123
├── Variant: thumbnail
│   └── Location
│       provider = r2
│
└── Variant: playback
    └── Location
        provider = cloudflare_stream
        provider_id = stream_uid_123
```

### tags

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_tags_workspace
ON tags(workspace_id);
```

### item_tags

```sql
CREATE TABLE item_tags (
  item_id UUID NOT NULL REFERENCES items(id),
  tag_id UUID NOT NULL REFERENCES tags(id),

  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_item_tags_tag
ON item_tags(tag_id);
```

### uploads

Remote upload lifecycle records should be separate from permanent media-location records.

```sql
CREATE TABLE uploads (
  id UUID PRIMARY KEY,

  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),

  media_variant_id UUID NOT NULL
    REFERENCES media_variants(id),

  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  expected_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

Possible statuses:

```text
pending
uploaded
verified
failed
expired
```

### sync_changes

Future server-side change feed for local ↔ remote synchronization.

```sql
CREATE TABLE sync_changes (
  version BIGSERIAL PRIMARY KEY,

  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_changes_workspace_version
ON sync_changes(workspace_id, version);
```

Possible operations:

```text
create
update
delete
```

### Local IndexedDB Model

The local browser database should mirror the logical entities where practical.

Recommended IndexedDB object stores:

```text
collections
folders
items
sources
siteSources
mediaSources
mediaVariants
mediaLocations
tags
itemTags
changeLog
syncStates
preferences
```

The `items` store must index `savedAt` for the Saved view.

The actual file bytes stay in OPFS.

Suggested OPFS layout:

```text
/media/
  /<mediaSourceId>/
    original
    thumbnail.webp
    playback.mp4
```

Example website assets:

```text
/media/
  /media_og_123/
    original.webp

  /media_hero_456/
    original.webp
    thumbnail.webp
```

Example video:

```text
/media/
  /media_video_789/
    original.mp4
    thumbnail.webp
    playback.mp4
```

### Example Website Records

```text
items
-----
id = item_site_1
type = site
source_id = source_site_1
thumbnail_media_source_id = media_hero_1
```

```text
sources
-------
id = source_site_1
kind = site
```

```text
site_sources
------------
source_id = source_site_1
url = https://example.com
og_image_media_source_id = media_og_1
hero_media_source_id = media_hero_1
```

Open Graph image:

```text
sources
-------
id = media_og_1
kind = media

media_sources
-------------
source_id = media_og_1
media_type = image
```

Hero screenshot:

```text
sources
-------
id = media_hero_1
kind = media

media_sources
-------------
source_id = media_hero_1
media_type = image
```

The user changes the card thumbnail by updating only:

```text
items.thumbnail_media_source_id
```

### Example Video Records

```text
items
-----
id = item_video_1
type = video
source_id = media_video_1
thumbnail_media_source_id = media_video_1
```

```text
sources
-------
id = media_video_1
kind = media
```

```text
media_sources
-------------
source_id = media_video_1
media_type = video
duration_seconds = 32.5
processing_status = ready
```

Variants:

```text
media_variants
--------------
original
thumbnail
playback
```

Local locations:

```text
original  → OPFS
thumbnail → OPFS
playback  → OPFS
```

Possible remote locations:

```text
original  → R2
thumbnail → R2
playback  → Cloudflare Stream
```

---

## 10. Additional Backend Endpoints for Website and Media Processing

### Create Website Item

Website items continue to use the generic item endpoint:

```http
POST /api/v1/items
```

Example request:

```json
{
  "id": "item_123",
  "workspaceId": "ws_123",
  "collectionId": "collection_123",
  "folderId": "folder_123",
  "type": "site",
  "source": {
    "id": "source_123",
    "url": "https://linear.app"
  }
}
```

Backend flow:

```text
create item
create source
create site source
queue metadata extraction
queue hero screenshot capture
return item
```

The initial response may expose:

```text
captureStatus = pending
```

### Refresh Website

```http
POST /api/v1/sites/:sourceId/refresh
```

### Select Item Thumbnail

Use the normal item update endpoint:

```http
PATCH /api/v1/items/:itemId
```

Payload:

```json
{
  "thumbnailMediaSourceId": "media_hero_123"
}
```

A dedicated thumbnail endpoint is unnecessary unless thumbnail management becomes substantially more complex.

### Item Detail

```http
GET /api/v1/items/:itemId
```

A site detail response should contain enough data for the page without requiring many extra requests:

```json
{
  "id": "item_123",
  "type": "site",
  "title": "Linear",
  "description": "...",
  "thumbnailMediaSourceId": "media_hero_123",
  "tags": [],
  "collection": {},
  "folder": {},
  "source": {
    "kind": "site",
    "url": "https://linear.app",
    "domain": "linear.app",
    "embedStatus": "allowed",
    "captureStatus": "ready",
    "ogImage": {},
    "heroScreenshot": {}
  }
}
```

### Create Video Item

```http
POST /api/v1/items
```

Example request:

```json
{
  "id": "item_video_123",
  "workspaceId": "ws_123",
  "collectionId": "collection_123",
  "folderId": "folder_123",
  "type": "video",
  "source": {
    "id": "media_video_123",
    "filename": "interaction.mov",
    "mimeType": "video/quicktime",
    "sizeBytes": 42000000
  }
}
```

Backend flow:

```text
permission check
entitlement check
quota check
create source
create media source
create media variants
create upload session
return direct-upload information
```

Expected variants:

```text
original
thumbnail
playback
```

### Video Processing Callback

When an external video-processing provider is used:

```http
POST /api/v1/webhooks/cloudflare-stream
```

The webhook can update:

```text
media_sources.processing_status
media_variants.processing_status
media_locations
```

### Retrieve Media Details

Usually item responses should already contain resolved thumbnails and playback information. A dedicated endpoint is still useful for media-heavy detail views:

```http
GET /api/v1/media/:mediaSourceId
```

Example response:

```json
{
  "id": "media_video_123",
  "mediaType": "video",
  "variants": [
    {
      "kind": "thumbnail",
      "url": "..."
    },
    {
      "kind": "playback",
      "url": "..."
    }
  ]
}
```

The frontend should not need to know R2 object keys or Cloudflare Stream implementation details directly.
