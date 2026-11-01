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
  library: bridgeMethods('library', LIBRARY_METHODS),
  media: bridgeMethods('media', MEDIA_METHODS),
  folder: bridgeMethods('folder', ['status', 'choose', 'reveal']),
  onLibraryChange(callback) {
    const listener = (_event, change) => callback(change);
    ipcRenderer.on('library:changed', listener);
    return () => ipcRenderer.removeListener('library:changed', listener);
  },
});
