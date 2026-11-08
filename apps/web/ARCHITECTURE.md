# Web App Architecture

How the domains in `src/features/` fit together. For the behavior of each one, read its `<feature>.spec.md`.

## Layers

Every domain uses the same four layers. Each layer only calls the layer below it.

```text
routes/ + components/        UI: pages, dialogs, cards
        │  calls hooks
features/<x>/…-hooks.ts      React Query: cache keys, mutations, toasts
        │  calls actions
features/<x>/…-actions.ts    Domain logic: validate (zod), read and write records
        │
features/storage/            LibraryStore: IndexedDB on the web, files in the library folder on desktop  ·  OPFS (account folder in storage-directory.ts, media in sources/source-media.ts)
```

- The UI never touches IndexedDB or OPFS directly.
- Actions get records only from `getLibraryStore()`. In the desktop app that store is `window.madoDesktop.library`, which the Electron main process answers from files (see `apps/desktop/desktop.spec.md`).
- Actions don't know about React. They are plain async functions and are tested with `fake-indexeddb`.
- Hooks own cache invalidation. After a write, they refresh every query that the change can affect.
- `src/hooks/` holds hooks with no domain (`useInView`, `createLocalPreference` for look choices in `localStorage`). Any feature may use them, and they import no feature.

## Domain map

```mermaid
graph LR
  auth -->|sets the account| storage
  settings -->|auth forms, sign-out| auth
  settings -->|which sign-in methods are on| flags
  settings -->|General tab: folder sources, folder look| collections
  settings -->|Data tab| export
  settings -->|Data tab| import
  settings -->|Feedback tab| feedback
  settings -->|Shortcuts tab, ? key| shortcuts
  settings -->|file sizes by kind, General tab: source names| sources
  settings -->|storage estimate, formatBytes| storage
  export -->|records, media files| sources
  export -->|records| collections
  export -->|account folder| storage
  import -->|library.json schema| export
  import -->|createSource, media files, compression| sources
  import -->|types only| collections
  import -->|ids, records| storage
  sources --> storage
  collections --> storage
  sources -->|collectionKeys, Collection type, folder sources setting| collections
  collections -->|counts, previews, deletes| sources
  search -->|types only| collections
  search -->|types only| sources
  search -->|account for recent searches| storage
  storage -->|getDesktopBridge| desktop
  desktop -->|LibraryStore type| storage
  desktop -->|query keys to refresh| sources
  desktop -->|query keys to refresh| collections
  settings -->|Library folder row, no quota| desktop
```

| Domain        | Depends on                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`        | `storage`                                                                                                    | Sets the account, which picks the database and the OPFS folder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `flags`       | none                                                                                                         | Reads feature flags from env; any domain may read them, and they read no domain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `desktop`     | `sources`, `collections`, `storage`                                                                          | The `window.madoDesktop` bridge type, `getDesktopBridge()` (the one place that asks "are we on desktop?"), and the hooks for the library folder and live reload. It only exists in the Electron app; on the web the bridge is `undefined`                                                                                                                                                                                                                                                                                                                                                      |
| `storage`     | `desktop`                                                                                                    | The base layer. It only asks `desktop` whether a bridge exists, to pick the IndexedDB store or the folder store                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `settings`    | `auth`, `collections`, `desktop`, `export`, `feedback`, `import`, `flags`, `shortcuts`, `sources`, `storage` | The panel hosts Google sign-in (and the paused email forms) and sign-out; it owns the theme choice (browser-wide, not per account, so it needs no other domain); the General tab shows the folder sources switch from `collections`; the Data tab shows storage used (file sizes from `sources`, the browser estimate from `storage`, or on desktop the Library folder row from `desktop` and no quota) and starts an export or an import; the Feedback tab shows the form from `feedback`; the Shortcuts tab shows the list from `shortcuts`, and the `?` key opens it; it owns no other data |
| `sources`     | `storage`, `collections`                                                                                     | Stores records and files; uses `collectionKeys` to refresh counts, the `Collection` type for nesting, and the folder sources setting to pick a collection's sources                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `collections` | `storage`, `sources`                                                                                         | Counts, previews and deletes go through `source-actions` (`countSourcesByCollection`, `collectBranchIds`, `softDeleteSourcesInCollection`)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `search`      | `collections`, `sources`, `storage`                                                                          | Types only for the data; the account keys the recent-search list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `export`      | `collections`, `sources`, `storage`                                                                          | Reads every record and media file; builds the zip in the account's OPFS folder when there is no save picker                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `import`      | `export`, `sources`, `collections`, `storage`                                                                | Reads `library.json` with export's schema; saves files through `sources`; writes records with their own ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `feedback`    | none                                                                                                         | Sends a message to the API; it stores nothing on the device                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `landing`     | none                                                                                                         | The page at `/` shows a picture of the library built from static files in `public/landing`, so it reads no local data. It still lives under `(app)`, which adds the session check                                                                                                                                                                                                                                                                                                                                                                                                              |
| `shortcuts`   | none                                                                                                         | Decides what a key press means (one pure function) and holds the list shown in Settings. The action dock (search), the source grid (select all, delete) and the settings dialog (`?`) listen through `useShortcuts`; it reads no data                                                                                                                                                                                                                                                                                                                                                          |

**Known coupling:** `collections` and `sources` import each other, in both actions and hooks. It works because nesting rules (`collectBranchIds`) live in `sources`. If this grows, move the shared nesting helpers into `collections` or a small shared module.

## Web app installation

The root document links to the static `public/manifest.webmanifest` and app icons. The installed app opens `/library` in a standalone window using the existing web storage and account flows. There is no service worker or offline startup path yet. See [PWA](src/features/pwa/pwa.spec.md).

## Outside the app

| Call                                   | Where                              | Why                                                                                 |
| -------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/auth/get-session`            | `auth/auth-session.ts` (server fn) | Session check for every `(app)` page                                                |
| `better-auth` client                   | `auth/auth-client.ts`              | Google sign-in, sign-out (and email forms when turned on)                           |
| `POST /api/v1/sites/preview`, `/image` | `sources/source-media.ts`          | Site metadata, embed mode, OG image (the browser can't fetch these because of CORS) |
| `POST /api/v1/feedback`                | `feedback/feedback-actions.ts`     | Saves a feedback message (and an optional email) in Postgres                        |

The API lives in `apps/api`. Everything else stays on the device.

## Key flows

### Desktop library startup

Electron reads the saved library path before opening the window. Without a valid config, it creates and saves the default `Documents/mado` library using the system Documents path. A saved path always wins; if that folder is missing, the desktop gate asks the user to choose a folder or retry instead of creating an empty library. Settings can switch libraries without moving files.

### Landing intro

The route composes the landing sections. `landing-header.tsx` owns the header and section tracking; `landing-hero.tsx` owns the animated gallery. They share the hero element ref so the header changes its background when the hero ends.

The landing route owns a Lenis instance for smooth wheel scrolling and anchor links. Its automatic frame loop and listeners are destroyed when leaving the page. Lenis respects reduced motion, allows nested scroll areas, and pauses when root overflow is hidden during the intro or a dialog.

The landing intro clips an overlapping cluster into a rounded rectangular opening, then expands the opening, fades out the wordmark, and spreads the same tiles to their hero float positions at the same time. `introClusterFloat` and `mixFloat` share `spread` with the existing scroll-to-library move. Reduced motion skips the intro.

The features stage uses the same section scroll progress for the pain sentence's word-by-word fade, rise and blur reveal, then triggers a 400ms crossfade into the feature demos at a fixed scroll threshold, independent of further scrolling. Word motion values update without React renders; reduced motion removes the rise and blur.

### Action dock scrolling

`ActionDock` uses `useHideOnScroll` to hide after 200px of downward scrolling and return on upward scrolling. CSS limits scroll hiding to `prefers-reduced-motion: no-preference`, so the dock stays visible during scrolling with reduced motion enabled, including before hydration and when the preference changes. Focus inside the dock also keeps it visible.

### Add a source

```text
drop / paste / action dock
  → useSourceDropzone / usePasteSource            (sources hooks)
  → useCreateSources → createSources              each file saved on its own
      → writeMediaFile (OPFS) → put record (IDB)
  → onSuccess: compressSource, queued one at a time
      → runCompression: skip if the storageKey changed or the record is gone
  → invalidate sources + collections queries      counts and previews update
```

A pasted URL goes `createWebsiteSource` → `fetchSitePreview` (API) → save the OG image or the X video.

### Replace a source's file

```text
toolbar / viewer / panel thumbnail
  → useReplaceSourceDropzone   one shared busy state (REPLACE_MUTATION_KEY)
  → replaceSourceFile
      → write the new file under a new key
      → in one transaction: decide the kind from fresh data, save the record
      → delete the old file
  → compressSource (the same queue as above)
```

### Delete a collection

```text
collection page "…" menu  or  card context menu
  → confirm dialog → useDeleteCollection → deleteCollection
  → one transaction over collections + sources:
      for the collection and every folder below it:
        softDeleteSourcesInCollection   trash the sources only here, detach the rest
        delete the collection
  → refresh collections + sources + trash
  → from the collection page: navigate to /library. From a card: stay.
```

### Edit a collection from its card

```text
right-click / long-press a CollectionCard
  → CollectionContextMenu (MorphContextMenu from @repo/ui)
  → Rename / Change color / Delete → its dialog
  → useUpdateCollection → updateCollection (zod-checked)   or   the delete flow above
  → update the list and detail caches in place
```

### Account switch

```text
every (app) page: beforeLoad → loadPageSession
  → server: get-session
  → client: if the account changed → full reload (stops cross-account writes)
            else setStorageAccount(user.id)
  → openDatabase() and getMediaDirectory() now use that account's database and folder
sign-out → clear the query cache → full reload to /library (the guest library)
```

### Export the library

```text
Settings → Data → Export
  → useExportLibrary → openExportTarget          picker first: browsers allow it only right after a click
      Chrome/Edge: showSaveFilePicker → the user's file
      others:      remove zips over an hour old → new random-named zip in the account's exports/
  → exportLibrary
      → waitForCompressions                        compression rewrites files in place
      → fetchAllCollections + fetchAllSources     one snapshot, trash left out
      → buildExportLayout                          pure: folders, safe unique names, library.json
      → makeZip(readZipEntries).pipeTo(file)       one file at a time; a missing file is skipped and listed
      → finish: nothing, or download the OPFS file
  → toast: "Exported N sources." or the error
```

### Import a folder

```text
Settings → Data → Import a folder → <input webkitdirectory> → File[]
  → useImportLibrary → importLibrary
      → readManifest: library.json at the top, checked by exportManifestSchema (broken → plain folder)
      → readExistingIds: every collection and source key, trash included
      → buildImportPlan                     pure
          export folder: keep ids, skip ids already here, any copy of a file will do
          plain folder:  the picked folder and each subfolder → a new collection
      → saveCollections                      one transaction
      → each item, one at a time:
          export folder: writeMediaFile under a new key → add the record (never put)
          plain folder:  createSource
        one failure is counted, a full disk stops it
  → plain-folder sources go to the compression queue
  → refresh sources + collections, toast: "Imported N sources and M collections."
```

### Settings panel and email links

```text
⚙ button → ?settings=general → (app)/route.tsx renders SettingsDialog
  → useSettingsSearch parses settings, auth, token, verified, error (zod, bad values dropped)
  → General: the folder sources switch (useShowFolderSources from collections)
  → General: Light / Dark / System radios (useSettingsTheme)
  → Account, guest: SettingsAuthForm   signed in: name, email, Sign out
     email paused (default): only "Continue with Google"
     email on: Google button, then the email form (mode from ?auth)
Continue with Google → useGoogleSignIn → signInWithGoogle → POST /api/auth/sign-in/social
  → full-page redirect to Google → /api/auth/callback/google (Better Auth sets the cookie)
  → back to the same page; a fresh load picks the account storage
  → on error: same page + settings=account&error=code; fixed copy, raw text never shown
verify-email link → /library?settings=account&verified=true
reset link        → /library?settings=account&auth=reset-password&token=…
sign-in OK → full reload of the current page without the settings params
```

### Theme

```text
first load → SETTINGS_THEME_SCRIPT in <head> reads localStorage mado:theme
  + prefers-color-scheme → toggles html.dark before the body paints
hydrate → SettingsThemeSync (__root) → useSettingsTheme → createSettingsThemeStore
  → listens to device changes (System only) and storage events (other tabs)
Appearance radio → setPreference → html.dark at once → try save to localStorage
html.dark → .dark tokens in @repo/ui + color-scheme: dark
```

Dark mode accents and focus rings use the light mode background color (`oklch(0.96 0 0)`), with dark text on accent fills.

### Desktop website preview

`SourceDetailViewer` → `DesktopSitePreview` → `getDesktopBridge().sitePreview` → trusted IPC → isolated Electron `WebContentsView`. The renderer sends a request id, HTTP(S) URL, and CSS bounds; the main process validates them and applies its zoom factor. Request ids prevent a late close or load from affecting a newer preview. Native content stays hidden until loading and dialog motion finish. Cleanup closes its web contents on source/dialog exit, renderer navigation, or window destruction. Browser previews retain the iframe/image fallback. Preview sites have no library bridge and use a separate in-memory session with device permissions denied.
