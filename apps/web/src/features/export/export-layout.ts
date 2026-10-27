import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';
import type { TextSourceContent } from '#/features/sources/text-source.type';

import type {
  ExportFile,
  ExportLayout,
  ExportManifest,
  ExportManifestSource,
} from './export.type';
import {
  EXPORT_MANIFEST_FORMAT,
  EXPORT_MANIFEST_NAME,
  EXPORT_MANIFEST_VERSION,
} from './export-manifest';

const UNSORTED_FOLDER = 'Unsorted';
const ROOT = '';
// Short, so nested folders stay under the 260-character path limit of Windows Explorer.
const MAX_NAME_LENGTH = 60;

// Characters that Windows or macOS refuse in file names.
const UNSAFE_CHARACTERS = /[/\\:*?"<>|\p{Cc}]/gu;
// Windows treats `nul.txt` like `nul`, so only the part before the first dot counts.
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

// The stored file can differ from `fileName` after compression, and the mime type follows the file.
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

/** Pure, so every naming rule is tested without IndexedDB or OPFS. */
export function buildExportLayout(
  collections: Collection[],
  sources: Source[],
  exportedAt: Date,
): ExportLayout {
  const names = createNameRegistry();
  const folderPaths = buildFolderPaths(collections, names);
  const files = sources.flatMap((source) => {
    const folders = source.collectionIds.flatMap(
      (id) => folderPaths.get(id) ?? [],
    );
    const targets = folders.length > 0 ? folders : [UNSORTED_FOLDER];
    return targets.flatMap((folder) => toSourceFiles(source, folder, names));
  });

  return {
    rootName: toExportName(exportedAt),
    folders: [...folderPaths.values()],
    files,
    manifest: toManifest(collections, sources, folderPaths, files, exportedAt),
  };
}

export function toExportName(date: Date): string {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  return `mado-export-${day}`;
}

// *** createNameRegistry ***
// Case-insensitive, because macOS and Windows treat "A.png" and "a.png" as one file.
function createNameRegistry() {
  const taken = new Map<string, Set<string>>([
    [ROOT, new Set([UNSORTED_FOLDER, EXPORT_MANIFEST_NAME].map(toNameKey))],
  ]);

  return {
    claim(folder: string, stem: string, extension: string): string {
      const used = taken.get(folder) ?? new Set<string>();
      let name = `${stem}${extension}`;
      for (let count = 2; used.has(toNameKey(name)); count += 1) {
        name = `${stem} (${count})${extension}`;
      }
      taken.set(folder, used.add(toNameKey(name)));
      return name;
    },
  };
}

// *** toNameKey ***
function toNameKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

// *** buildFolderPaths ***
// Level by level, so a parent's path exists before its children need it.
function buildFolderPaths(
  collections: Collection[],
  names: ReturnType<typeof createNameRegistry>,
): Map<string, string> {
  const ids = new Set(collections.map((collection) => collection.id));
  const paths = new Map<string, string>();
  // A missing parent counts as top-level, so no collection is lost.
  let level = collections.filter(
    (collection) =>
      collection.parentId === null || !ids.has(collection.parentId),
  );

  while (level.length > 0) {
    for (const collection of level) {
      const parent = paths.get(collection.parentId ?? '') ?? ROOT;
      const name = names.claim(
        parent,
        toSafeName(collection.name, 'Collection'),
        '',
      );
      paths.set(collection.id, joinPath(parent, name));
    }
    level = collections.filter(
      (collection) =>
        !paths.has(collection.id) &&
        collection.parentId !== null &&
        paths.has(collection.parentId),
    );
  }

  return paths;
}

// *** toSafeName ***
function toSafeName(name: string, fallback: string): string {
  // Cut by characters, not UTF-16 units, so an emoji is never split in half.
  // NFC, because macOS treats the two ways of writing "é" as one name.
  const safe = Array.from(
    name.normalize('NFC').replace(UNSAFE_CHARACTERS, '-').trim(),
  )
    .slice(0, MAX_NAME_LENGTH)
    .join('')
    // Windows drops trailing dots and spaces, and a leading dot hides the file on macOS.
    .replace(/[. ]+$/, '')
    .replace(/^\.+/, '');

  if (safe === '') return fallback;
  return WINDOWS_RESERVED_NAME.test(safe) ? `${safe}-` : safe;
}

// *** joinPath ***
function joinPath(folder: string, name: string): string {
  return folder === ROOT ? name : `${folder}/${name}`;
}

// *** toSourceFiles ***
function toSourceFiles(
  source: Source,
  folder: string,
  names: ReturnType<typeof createNameRegistry>,
): ExportFile[] {
  const stem = toSafeName(source.name, 'Untitled');
  const lastModified = new Date(source.updatedAt);
  const shortcut: ExportFile[] =
    source.kind === 'website' && source.url
      ? [
          {
            kind: 'shortcut',
            sourceId: source.id,
            path: joinPath(folder, names.claim(folder, stem, '.url')),
            text: toShortcutText(source.url),
            lastModified,
          },
        ]
      : [];
  const text: ExportFile[] = source.text
    ? [
        {
          kind: 'text',
          sourceId: source.id,
          path: joinPath(
            folder,
            names.claim(folder, stem, toTextExtension(source.text)),
          ),
          text: source.text.body,
          lastModified,
        },
      ]
    : [];
  const media: ExportFile[] = source.storageKey
    ? [
        {
          kind: 'media',
          sourceId: source.id,
          path: joinPath(
            folder,
            names.claim(folder, stem, toExtension(source)),
          ),
          storageKey: source.storageKey,
          lastModified,
        },
      ]
    : [];

  return [...shortcut, ...text, ...media];
}

// *** toShortcutText ***
// A `.url` file opens in the browser on both Windows and macOS.
// Line breaks are removed so a stored URL cannot add its own lines to the file.
function toShortcutText(url: string): string {
  return `[InternetShortcut]\r\nURL=${url.replace(/[\r\n]/g, '')}\r\n`;
}

// *** toTextExtension ***
// Keep `.markdown` if that is what the user had, but never write an odd one like `.text`.
function toTextExtension(text: TextSourceContent): string {
  const match = /\.(md|markdown|txt)$/i.exec(text.fileName);
  if (match) return match[0].toLowerCase();
  return text.format === 'markdown' ? '.md' : '.txt';
}

// *** toExtension ***
function toExtension(source: Source): string {
  const fromMime = MIME_EXTENSIONS[source.mimeType];
  if (fromMime) return fromMime;

  const match = /\.[a-z0-9]{1,8}$/i.exec(source.fileName);
  return match ? match[0].toLowerCase() : '';
}

// *** toManifest ***
function toManifest(
  collections: Collection[],
  sources: Source[],
  folderPaths: Map<string, string>,
  files: ExportFile[],
  exportedAt: Date,
): ExportManifest {
  const filesBySource = files.reduce(
    (groups, file) =>
      groups.set(file.sourceId, [
        ...(groups.get(file.sourceId) ?? []),
        { path: file.path, role: file.kind },
      ]),
    new Map<string, ExportManifestSource['files']>(),
  );

  return {
    format: EXPORT_MANIFEST_FORMAT,
    version: EXPORT_MANIFEST_VERSION,
    exportedAt: exportedAt.toISOString(),
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      parentId: collection.parentId,
      color: collection.color,
      path: folderPaths.get(collection.id) ?? '',
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    })),
    // `storageKey` only means something inside this browser, so it stays out.
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      kind: source.kind,
      url: source.url,
      note: source.note,
      tags: source.tags,
      collectionIds: source.collectionIds,
      ...(source.site && { site: source.site }),
      ...(source.text && {
        text: { format: source.text.format, fileName: source.text.fileName },
      }),
      fileName: source.fileName,
      mimeType: source.mimeType,
      sizeBytes: source.sizeBytes,
      width: source.width,
      height: source.height,
      durationSeconds: source.durationSeconds,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      files: filesBySource.get(source.id) ?? [],
    })),
    missingFiles: [],
  };
}
