import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, protocol, shell } from 'electron';

import { registerSitePreviewIpc } from './site-preview.js';
import { checkForUpdate } from './update-check.js';

import { MEDIA_SCHEME, registerLibraryIpc } from './ipc.js';

// The desktop app skips the landing page at "/" and opens the library directly.
// Why: a downloaded app has no dev server, so it opens the deployed web app.
const DEV_WEB_URL = 'http://localhost:3100/library';
const LIVE_WEB_URL = 'https://mado-design.com/library';
const WEB_URL =
  process.env.MADO_WEB_URL ?? (app.isPackaged ? LIVE_WEB_URL : DEV_WEB_URL);
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

// A second launch of the same app would fight the first over the library, so it shows the first window instead.
if (!app.requestSingleInstanceLock()) app.quit();
else startApp();

// *** startApp ***
function startApp() {
  app.on('second-instance', focusWindow);

  app.whenReady().then(async () => {
    const library = await registerLibraryIpc({
      send: sendToWindows,
      isTrustedSender,
    });
    releaseLibraryOnQuit(library);
    registerSitePreviewIpc({ isTrustedSender });
    createWindow();
    // A dev build has no release to compare against.
    if (app.isPackaged) void offerUpdate();
  });
}

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

// *** focusWindow ***
function focusWindow() {
  const [win] = BrowserWindow.getAllWindows();
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.focus();
}

// *** releaseLibraryOnQuit ***
// A leftover lock is only taken over when its process is gone, and macOS reuses process ids, so quitting removes it first.
function releaseLibraryOnQuit(library) {
  let released = false;
  app.on('before-quit', (event) => {
    if (released) return;
    event.preventDefault();
    released = true;
    library
      .close()
      .catch((error) => console.error('Failed to close the library', error))
      .finally(() => app.quit());
  });
}

// *** offerUpdate ***
// The check must never stop the app, so a failure is only logged.
async function offerUpdate() {
  try {
    const update = await checkForUpdate(app.getVersion());
    if (!update) return;
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: `Mado ${update.version} is available`,
      detail: `You have ${app.getVersion()}. Download the new version, then replace Mado in your Applications folder.`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) openExternally(update.url);
  } catch (error) {
    console.error('Update check failed', error);
  }
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
