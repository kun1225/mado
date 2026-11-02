# PWA

## Purpose

Let users install Mado through their browser and open their library in its own window.

## Behavior

- The root document links to `/manifest.webmanifest` and a 180px Apple touch icon.
- The manifest sets a stable id (`/`), root scope, and `/library` as the launch URL.
- Standalone display opens the app in its own window where supported.
- The 192px and 512px PNG icons use the existing logo on an opaque light background. The 512px icon keeps the mark inside the maskable safe area. `public/icons/icon.svg` is their source.
- Production installation requires HTTPS. Installation uses the browser UI; availability and prompts depend on the browser.

## Decisions

- Use browser installation without a new dependency or custom install dialog.
- Ship installation separately from offline startup; there is no service worker yet.

## Known gaps

- Opening the app still needs a connection for the app shell and server session checks.
- Installation does not add sync, backups, or native access to a library folder.
