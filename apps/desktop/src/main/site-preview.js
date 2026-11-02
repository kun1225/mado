import { BrowserWindow, ipcMain, WebContentsView } from 'electron';

const BOUNDS_KEYS = ['x', 'y', 'width', 'height'];

export function registerSitePreviewIpc({ isTrustedSender }) {
  const previews = new Map();
  const handle = (name, run) =>
    ipcMain.handle(`sitePreview:${name}`, async (event, request) => {
      if (!isTrustedSender(event)) throw new Error('Untrusted sender.');
      if (!request || typeof request.id !== 'string')
        throw new Error('Invalid preview.');
      return run(event.sender, request);
    });

  handle('open', (sender, request) => openPreview(previews, sender, request));
  handle('resize', (sender, request) =>
    resizePreview(previews, sender, request),
  );
  handle('close', (sender, request) => {
    if (previews.get(sender)?.id === request.id) closePreview(previews, sender);
  });
}

// *** openPreview ***
async function openPreview(previews, sender, request) {
  // Bad bounds must fail before any native view exists.
  parseBounds(request.bounds, sender.getZoomFactor());
  if (!isHttpUrl(request.url)) throw new Error('Invalid website URL.');
  closePreview(previews, sender);
  const win = BrowserWindow.fromWebContents(sender);
  if (!win) throw new Error('Missing preview window.');

  const view = createView();
  const preview = { id: request.id, view, win };
  previews.set(sender, preview);
  win.contentView.addChildView(view);
  view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  closeWhenRendererLeaves(previews, sender, view);
  try {
    await view.webContents.loadURL(request.url);
    return previews.get(sender) === preview;
  } catch {
    if (previews.get(sender) === preview) closePreview(previews, sender);
    return false;
  }
}

// *** resizePreview ***
function resizePreview(previews, sender, request) {
  const bounds = parseBounds(request.bounds, sender.getZoomFactor());
  const preview = previews.get(sender);
  if (preview?.id === request.id) preview.view.setBounds(bounds);
}

// *** closePreview ***
function closePreview(previews, sender) {
  const preview = previews.get(sender);
  if (!preview) return;
  previews.delete(sender);
  if (!preview.win.isDestroyed())
    preview.win.contentView.removeChildView(preview.view);
  if (!preview.view.webContents.isDestroyed()) preview.view.webContents.close();
}

// *** createView ***
function createView() {
  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'mado-site-preview',
    },
  });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  for (const name of ['will-navigate', 'will-redirect']) {
    view.webContents.on(name, (navigation, target) => {
      if (!isHttpUrl(target)) navigation.preventDefault();
    });
  }
  // Websites never receive device permissions or the app's library preload.
  view.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  view.webContents.session.setPermissionCheckHandler(() => false);
  return view;
}

// *** closeWhenRendererLeaves ***
function closeWhenRendererLeaves(previews, sender, view) {
  const cleanup = () => closePreview(previews, sender);
  sender.once('destroyed', cleanup);
  sender.once('did-start-navigation', cleanup);
  view.webContents.once('destroyed', () => {
    sender.removeListener('destroyed', cleanup);
    sender.removeListener('did-start-navigation', cleanup);
  });
}

// *** isHttpUrl ***
function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

// *** parseBounds ***
function parseBounds(bounds, zoom) {
  if (
    !bounds ||
    !BOUNDS_KEYS.every(
      (key) => Number.isFinite(bounds[key]) && bounds[key] >= 0,
    )
  ) {
    throw new Error('Invalid preview bounds.');
  }
  return Object.fromEntries(
    BOUNDS_KEYS.map((key) => [key, Math.round(bounds[key] * zoom)]),
  );
}
