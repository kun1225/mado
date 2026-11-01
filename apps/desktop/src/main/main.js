import { app, BrowserWindow } from 'electron';

// The desktop app skips the landing page at "/" and opens the library directly.
const WEB_URL = process.env.MADO_WEB_URL ?? 'http://localhost:3100/library';

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 800 });
  win.loadURL(WEB_URL);
}

app.whenReady().then(createWindow);

// macOS apps stay alive after the last window closes, so we quit only on other systems.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Clicking the dock icon with no window open should bring one back.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
