import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, protocol, shell } from 'electron';

import { MEDIA_SCHEME, registerLibraryIpc } from './ipc.js';

// The desktop app skips the landing page at "/" and opens the library directly.
const WEB_URL = process.env.MADO_WEB_URL ?? 'http://localhost:3100/library';
const PRELOAD_PATH = fileURLToPath(new URL('../preload.cjs', import.meta.url));

// Must run before the app is ready, or the web app can't `fetch` media URLs.
protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

app.whenReady().then(() => {
  registerLibraryIpc({ send: sendToWindows });
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
  win.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin === new URL(WEB_URL).origin) return;
    event.preventDefault();
    openExternally(url);
  });

  win.loadURL(WEB_URL);
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
