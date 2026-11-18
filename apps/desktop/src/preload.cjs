const { contextBridge, ipcRenderer } = require('electron');

// Sandboxed preload scripts can't import local files, so these lists repeat the ones in `main/ipc.js`.
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

function bridgeMethods(prefix, names) {
  return Object.fromEntries(
    names.map((name) => [
      name,
      (...args) => ipcRenderer.invoke(`${prefix}:${name}`, ...args),
    ]),
  );
}

// Only named functions are exposed, so the page never gets `ipcRenderer` or Node.
contextBridge.exposeInMainWorld('madoDesktop', {
  sitePreview: bridgeMethods('sitePreview', ['open', 'resize', 'close']),
  library: bridgeMethods('library', LIBRARY_METHODS),
  media: bridgeMethods('media', MEDIA_METHODS),
  folder: bridgeMethods('folder', [
    'status',
    'choose',
    'recreate',
    'reveal',
    'problems',
  ]),
  onLibraryChange: (callback) => listen('library:changed', callback),
  onLibraryProblem: (callback) => listen('library:problem', callback),
});

// *** listen ***
function listen(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
