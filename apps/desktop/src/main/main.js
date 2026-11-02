import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, protocol, shell } from 'electron';

import { registerSitePreviewIpc } from './site-preview.js';

import { MEDIA_SCHEME, registerLibraryIpc } from './ipc.js';

// The desktop app skips the landing page at "/" and opens the library directly.
const WEB_URL = process.env.MADO_WEB_URL ?? 'http://localhost:3100/library';
const WEB_ORIGIN = new URL(WEB_URL).origin;
const PRELOAD_PATH = fileURLToPath(new URL('../preload.cjs', import.meta.url));

// Must run before the app is ready, or the web app can't `fetch` media URLs.
protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      // The page is served from http://localhost, so reading these URLs is a cross-origin request.
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.whenReady().then(async () => {
  await registerLibraryIpc({ send: sendToWindows, isTrustedSender });
  registerSitePreviewIpc({ isTrustedSender });
  createWindow();
});

// macOS apps stay alive after the last window closes, so we quit only on other systems.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Clicking the dock icon with no window open should bring one back.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// *** createWindow ***
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { preload: PRELOAD_PATH },
  });

  // A page we open from a link must not get the library bridge, so links go to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: 'deny' };
  });
  // A redirect can leave our origin without a `will-navigate`, so it gets the same check.
  for (const eventName of ['will-navigate', 'will-redirect']) {
    win.webContents.on(eventName, (event, url) => {
      if (new URL(url).origin === WEB_ORIGIN) return;
      event.preventDefault();
      openExternally(url);
    });
  }

  win.loadURL(WEB_URL);
}

// *** isTrustedSender ***
// Only the top frame of our own page may use the library, never an embedded or redirected page.
function isTrustedSender(event) {
  const frame = event.senderFrame;
  if (!frame || frame !== event.sender.mainFrame) return false;
  try {
    return new URL(frame.url).origin === WEB_ORIGIN;
  } catch {
    return false;
  }
}

// *** sendToWindows ***
function sendToWindows(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

// *** openExternally ***
// Only web links. A `file:` or custom scheme link could reach things on this Mac.
function openExternally(url) {
  if (/^https?:\/\//.test(url)) void shell.openExternal(url);
}
