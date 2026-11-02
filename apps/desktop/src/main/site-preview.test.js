import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Electron's native API is unavailable in Node, so only that boundary is replaced.
const source = (
  await readFile(new URL('./site-preview.js', import.meta.url), 'utf8')
).replace(
  "import { BrowserWindow, ipcMain, WebContentsView } from 'electron';",
  'const { BrowserWindow, ipcMain, WebContentsView } = globalThis.sitePreviewTestElectron;',
);

async function setup() {
  const handlers = new Map();
  const views = [];
  const children = new Set();
  const sender = new EventEmitter();
  sender.getZoomFactor = () => 2;
  const win = {
    isDestroyed: () => false,
    contentView: {
      addChildView: (view) => children.add(view),
      removeChildView: (view) => children.delete(view),
    },
  };
  class View {
    constructor(options) {
      this.options = options;
      this.webContents = new EventEmitter();
      this.webContents.isDestroyed = () => !!this.closed;
      this.webContents.session = {
        setPermissionRequestHandler() {},
        setPermissionCheckHandler() {},
      };
      this.webContents.setWindowOpenHandler = (handler) => {
        this.popup = handler;
      };
      this.webContents.loadURL = (url) => {
        this.url = url;
        return new Promise((resolve, reject) => {
          this.resolve = resolve;
          this.reject = reject;
        });
      };
      this.webContents.close = () => {
        this.closed = true;
        this.webContents.emit('destroyed');
      };
      views.push(this);
    }
    setBounds(bounds) {
      this.bounds = bounds;
    }
  }
  globalThis.sitePreviewTestElectron = {
    BrowserWindow: { fromWebContents: () => win },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    WebContentsView: View,
  };
  const module = await import(
    `data:text/javascript,${encodeURIComponent(source)}#${Math.random()}`
  );
  module.registerSitePreviewIpc({
    isTrustedSender: (event) => event.sender === sender,
  });
  delete globalThis.sitePreviewTestElectron;
  const call = (method, request) =>
    handlers.get(`sitePreview:${method}`)({ sender }, request);
  const request = {
    id: 'first',
    url: 'https://example.com/',
    bounds: { x: 10, y: 20, width: 300, height: 200 },
  };
  return { call, request, views, children, sender, handlers };
}

test('loads isolated content hidden, applies zoom, and closes without leaking listeners', async () => {
  const { call, request, views, children, sender } = await setup();
  const opening = call('open', request);
  const view = views[0];
  assert.equal(view.url, request.url);
  assert.deepEqual(view.bounds, { x: 0, y: 0, width: 0, height: 0 });
  assert.equal(view.options.webPreferences.nodeIntegration, false);
  assert.equal(view.options.webPreferences.preload, undefined);
  assert.equal(view.options.webPreferences.sandbox, true);
  assert.deepEqual(view.popup(), { action: 'deny' });
  view.resolve();
  assert.equal(await opening, true);
  await call('resize', request);
  assert.deepEqual(view.bounds, { x: 20, y: 40, width: 600, height: 400 });
  await call('close', request);
  assert.equal(view.closed, true);
  assert.equal(children.size, 0);
  assert.equal(sender.listenerCount('destroyed'), 0);
});

test('stale close and failed load cannot close a newer preview', async () => {
  const { call, request, views, children } = await setup();
  const first = call('open', request);
  const second = call('open', { ...request, id: 'second' });
  views[0].reject(new Error('Aborted'));
  assert.equal(await first, false);
  await call('close', request);
  views[1].resolve();
  assert.equal(await second, true);
  assert.equal(children.has(views[1]), true);
  assert.equal(views[1].closed, undefined);
});

test('rejects untrusted callers, unsafe URLs and bad bounds', async () => {
  const { call, request, handlers } = await setup();
  await assert.rejects(
    handlers.get('sitePreview:open')({ sender: {} }, request),
    /Untrusted/,
  );
  await assert.rejects(
    call('open', { ...request, url: 'file:///etc/passwd' }),
    /Invalid website/,
  );
  await assert.rejects(
    call('open', { ...request, bounds: { ...request.bounds, width: NaN } }),
    /Invalid preview bounds/,
  );
});

test('failed loading and renderer navigation release native content', async () => {
  const { call, request, views, sender, children } = await setup();
  const failed = call('open', request);
  views[0].reject(new Error('Offline'));
  assert.equal(await failed, false);
  assert.equal(children.size, 0);
  const opening = call('open', request);
  views[1].resolve();
  await opening;
  sender.emit('did-start-navigation');
  assert.equal(children.size, 0);
  assert.equal(views[1].closed, true);
});
