import type { z } from 'zod';

import type { exportManifestSchema } from './export-manifest';

export type ExportManifest = z.infer<typeof exportManifestSchema>;

export type ExportManifestCollection = ExportManifest['collections'][number];

export type ExportManifestSource = ExportManifest['sources'][number];

/** `path` is inside the top folder of the zip. */
export type ExportFile =
  | {
      kind: 'media';
      sourceId: string;
      path: string;
      storageKey: string;
      lastModified: Date;
    }
  | {
      /** `shortcut` is a website's `.url` file, `text` is a text source's body. */
      kind: 'shortcut' | 'text';
      sourceId: string;
      path: string;
      text: string;
      lastModified: Date;
    };

export type ExportLayout = {
  rootName: string;
  /** Every collection gets a folder, so empty ones still show up. */
  folders: string[];
  files: ExportFile[];
  manifest: ExportManifest;
};

export type ExportProgress = {
  done: number;
  total: number;
};

export type ExportResult = {
  sourceCount: number;
  missingCount: number;
};

export type ExportTarget = {
  writable: WritableStream<Uint8Array>;
  /** Runs after the zip is fully written. */
  finish: () => Promise<void>;
};

export type ExportSaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

declare global {
  interface Window {
    /** Chrome and Edge only, so it is optional. */
    showSaveFilePicker?: ExportSaveFilePicker;
  }
}
