import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { app, dialog, ipcMain, net, protocol, shell } from 'electron';

import { createLibraryFolder } from './library-folder.js';
import { acquireLock } from './library-lock.js';
import { createLibraryMedia } from './library-media.js';
import { openLibrary } from './library-records.js';
import { prepareSchema } from './library-schema.js';
import { watchLibrary } from './library-watcher.js';

export const MEDIA_SCHEME = 'mado-media';

// The preload script is sandboxed and can't import this file, so it keeps the same two lists.
const LIBRARY_METHODS = [
  'listSources',
  'getSource',
  'listSourcesInCollection',
  'addSource',
  'putSources',
  'deleteSources',
  'listCollections',
  'getCollection',
  'putCollections',
  'deleteCollections',
];
const MEDIA_METHODS = [
  'beginWrite',
  'appendChunk',
  'finishWrite',
  'abortWrite',
  'remove',
];

const MIME_TYPE = /^[\w.+-]+\/[\w.+-]+$/;

/**
 * Connects the web app to the library folder. `send(channel, payload)` tells
 * every window about a change. `isTrustedSender(event)` says whether a call
 * comes from our own page, because any page in a window could call the bridge.
 */
export async function registerLibraryIpc({ send, isTrustedSender }) {
  const folder = createLibraryFolder({
    configPath: join(app.getPath('userData'), 'config.json'),
    defaultRoot: join(app.getPath('documents'), 'mado'),
    pickFolder,
    confirmCopy,
  });
  const library = createLibrarySession({ send });

  const handle = (channel, listener) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event)) throw new Error('Untrusted sender.');
      return listener(...args);
    });

  handle('folder:status', async () => library.open(await folder.getStatus()));
  handle('folder:choose', async () => {
    const status = await folder.choose();
    // A closed picker changes nothing, so the open library stays open.
    return status === null ? null : library.open(status);
  });
  handle('folder:recreate', async () => library.open(await folder.recreate()));
  handle('folder:reveal', async () => {
    const { path } = await folder.getStatus();
    if (path) await shell.openPath(path);
  });
  handle('folder:problems', () => [
    ...(library.current()?.problems.values() ?? []),
  ]);

  for (const name of LIBRARY_METHODS) {
    handle(`library:${name}`, (...args) =>
      library.require().records[name](...args),
    );
  }
  for (const name of MEDIA_METHODS) {
    handle(`media:${name}`, (...args) =>
      library.require().media[name](...args),
    );
  }

  registerMediaProtocol((key) => library.current()?.media.resolvePath(key));

  // Open before any window exists, or a page can ask for records before the library is ready.
  await library.open(await folder.getStatus());

  return { close: () => library.close() };
}

// *** pickFolder ***
async function pickFolder() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose where to keep your library',
    buttonLabel: 'Choose',
    properties: ['openDirectory', 'createDirectory'],
  });
  return canceled ? null : filePaths[0];
}

// *** confirmCopy ***
async function confirmCopy({ from, to }) {
  const { response } = await dialog.showMessageBox({
    type: 'question',
    message: 'Copy your library to the new folder?',
    detail: `Mado copies everything from ${from} to ${to}. The old folder stays as it is, and you can delete it later.`,
    buttons: ['Copy library', 'Start empty', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
  });
  return ['copy', 'empty', null][response];
}

// *** createLibrarySession ***
// Holds the one open library, and swaps it when the user picks another folder.
function createLibrarySession({ send }) {
  let session = null;
  // Opens run one at a time, or two at once could both start a watcher and one would leak.
  let queue = Promise.resolve();

  const switchTo = async (status) => {
    if (status?.status === 'ready' && session?.root === status.path) {
      return status;
    }
    // Detached before it closes, so no new call can write while the lock is let go.
    const closing = session;
    session = null;
    await closeSession(closing);
    if (status?.status !== 'ready') return status;

    const opened = await openSession(status.path, send);
    if (opened.blocked) return { status: 'blocked', ...opened.blocked };
    session = opened;
    return status;
  };

  const enqueue = (task) => {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
  };

  return {
    current: () => session,
    require: () => {
      if (!session) throw new Error('No library folder has been chosen.');
      return session;
    },
    // Resolves to the status the page should show: the one it was given, or `blocked`.
    open: (status) => enqueue(() => switchTo(status)),
    close: () => enqueue(() => switchTo(null)),
  };
}

// *** openSession ***
// The lock comes first and the schema second, so no other app writes while files migrate, and nothing reads them before.
async function openSession(root, send) {
  const lock = await acquireLock(root);
  if (!lock) return { blocked: { reason: 'locked', path: root } };

  try {
    const schema = await prepareSchema(root);
    if (!schema.ok) {
      await lock.release();
      return { blocked: { reason: schema.reason, path: root } };
    }
    return await openRecords(root, lock, send);
  } catch (error) {
    await lock.release();
    throw error;
  }
}

// *** openRecords ***
// Problems are kept as well as sent, because the ones found while opening come before any page listens.
// One per file, so a file the watcher reads again and again doesn't grow the list.
async function openRecords(root, lock, send) {
  const problems = new Map();
  const records = await openLibrary(root, {
    onProblem: (problem) => {
      console.warn(`Skipped ${problem.file}: ${problem.reason}`);
      problems.set(problem.file, problem);
      send('library:problem', problem);
    },
  });
  const media = await createLibraryMedia(join(root, 'media'));
  const stopWatching = watchLibrary(root, records, (kind) =>
    send('library:changed', { kind }),
  );

  return { root, records, media, stopWatching, lock, problems };
}

// *** closeSession ***
// Queued writes finish first, or another app could take the lock while this one still writes.
async function closeSession(session) {
  if (!session) return;
  session.stopWatching();
  await session.records.whenIdle();
  await session.media.close();
  await session.lock.release();
}

// *** registerMediaProtocol ***
// Media is read through a URL, not IPC, so the browser can stream a big video and jump around in it.
function registerMediaProtocol(resolvePath) {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    const url = new URL(request.url);
    let path;
    try {
      path = resolvePath(decodeURIComponent(url.pathname.slice(1)));
    } catch {
      return new Response(null, { status: 400 });
    }
    if (!path) return new Response(null, { status: 404 });

    try {
      const response = await net.fetch(pathToFileURL(path).toString(), {
        headers: request.headers,
      });
      const headers = new Headers(response.headers);
      // The page is served from another origin, so `fetch` needs this to read the file.
      headers.set('Access-Control-Allow-Origin', '*');
      const type = url.searchParams.get('type');
      // Stored files have no extension, so the caller says what they are.
      if (type && MIME_TYPE.test(type)) headers.set('Content-Type', type);

      return new Response(response.body, { status: response.status, headers });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}
