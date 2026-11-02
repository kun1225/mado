import type { LibraryStore } from '#/features/storage/library-store.type';

export type DesktopFolderStatus = {
  /** `none`: no folder chosen yet. `missing`: the chosen folder is gone. */
  status: 'none' | 'missing' | 'ready';
  path: string | null;
};

export type DesktopLibraryChange = { kind: 'sources' | 'collections' };

/** What the Electron preload script puts on `window.madoDesktop`. */
export type MadoDesktopBridge = {
  library: LibraryStore;
  media: {
    beginWrite: (key: string) => Promise<string>;
    appendChunk: (writeId: string, bytes: ArrayBuffer) => Promise<void>;
    finishWrite: (writeId: string) => Promise<void>;
    abortWrite: (writeId: string) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  folder: {
    status: () => Promise<DesktopFolderStatus>;
    /** Resolves to null when the user closes the picker. */
    choose: () => Promise<DesktopFolderStatus | null>;
    reveal: () => Promise<void>;
  };
  /** Returns a function that stops listening. */
  onLibraryChange: (
    callback: (change: DesktopLibraryChange) => void,
  ) => () => void;
};

declare global {
  interface Window {
    /** Only exists inside the desktop app. */
    madoDesktop?: MadoDesktopBridge;
  }
}
