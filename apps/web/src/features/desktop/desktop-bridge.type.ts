import type { LibraryStore } from '#/features/storage/library-store.type';

export type DesktopFolderStatus =
  | {
      /** `none`: no folder chosen yet. `missing`: the chosen folder is gone. */
      status: 'none' | 'missing' | 'ready';
      path: string | null;
    }
  | {
      /** The folder is there, but the app must not open it. */
      status: 'blocked';
      reason: DesktopFolderBlockedReason;
      path: string;
    };

/**
 * `locked`: another Mado app has the folder open. `needs-update`: a newer Mado
 * changed its files. `invalid`: `mado.json` can't be read.
 */
export type DesktopFolderBlockedReason = 'locked' | 'needs-update' | 'invalid';

export type DesktopLibraryChange = { kind: 'sources' | 'collections' };

/** A record file the app skipped, because it can't be read or is not valid. */
export type DesktopLibraryProblem = { file: string; reason: string };

export type DesktopSitePreviewBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** What the Electron preload script puts on `window.madoDesktop`. */
export type MadoDesktopBridge = {
  sitePreview: {
    open: (request: {
      id: string;
      url: string;
      bounds: DesktopSitePreviewBounds;
    }) => Promise<boolean>;
    resize: (request: {
      id: string;
      bounds: DesktopSitePreviewBounds;
    }) => Promise<void>;
    close: (request: { id: string }) => Promise<void>;
  };
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
    /** Makes the saved folder again at its old path. */
    recreate: () => Promise<DesktopFolderStatus>;
    reveal: () => Promise<void>;
    /** Missing in apps built before it. */
    problems?: () => Promise<DesktopLibraryProblem[]>;
  };
  /** Returns a function that stops listening. */
  onLibraryChange: (
    callback: (change: DesktopLibraryChange) => void,
  ) => () => void;
  /** Missing in apps built before it. Returns a function that stops listening. */
  onLibraryProblem?: (
    callback: (problem: DesktopLibraryProblem) => void,
  ) => () => void;
};

declare global {
  interface Window {
    /** Only exists inside the desktop app. */
    madoDesktop?: MadoDesktopBridge;
  }
}
