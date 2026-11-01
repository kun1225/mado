import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { app, dialog, ipcMain, net, protocol, shell } from 'electron';

import { createLibraryFolder } from './library-folder.js';
import { createLibraryMedia } from './library-media.js';
import { openLibrary } from './library-records.js';
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
 * every window about a change.
 */
export function registerLibraryIpc({ send }) {
  const folder = createLibraryFolder({
    configPath: join(app.getPath('userData'), 'config.json'),
    pickFolder,
  });
  const library = createLibrarySession({ send });

  ipcMain.handle('folder:status', async () =>
    library.open(await folder.getStatus()),
  );
  ipcMain.handle('folder:choose', async () =>
    library.open(await folder.choose()),
  );
  ipcMain.handle('folder:reveal', async () => {
    const { path } = await folder.getStatus();
    if (path) await shell.openPath(path);
  });

  for (const name of LIBRARY_METHODS) {
    ipcMain.handle(`library:${name}`, (_event, ...args) =>
      library.require().records[name](...args),
    );
  }
  for (const name of MEDIA_METHODS) {
    ipcMain.handle(`media:${name}`, (_event, ...args) =>
      library.require().media[name](...args),
    );
  }

  registerMediaProtocol((key) => library.current()?.media.resolvePath(key));
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

// *** createLibrarySession ***
// Holds the one open library, and swaps it when the user picks another folder.
function createLibrarySession({ send }) {
  let session = null;

  return {
    current: () => session,
    require: () => {
      if (!session) throw new Error('No library folder has been chosen.');
      return session;
    },
    // Resolves to the status it was given, so a caller can return it as it is.
    open: async (status) => {
      if (status?.status !== 'ready') {
        await closeSession(session);
        session = null;
      } else if (session?.root !== status.path) {
        await closeSession(session);
        session = await openSession(status.path, send);
      }
      return status;
    },
  };
}

// *** openSession ***
async function openSession(root, send) {
  const records = await openLibrary(root, {
    onProblem: (problem) => {
      console.warn(`Skipped ${problem.file}: ${problem.reason}`);
      send('library:problem', problem);
    },
  });
  const media = await createLibraryMedia(join(root, 'media'));
  const stopWatching = watchLibrary(root, records, (kind) =>
    send('library:changed', { kind }),
  );

  return { root, records, media, stopWatching };
}

// *** closeSession ***
async function closeSession(session) {
  session?.stopWatching();
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
