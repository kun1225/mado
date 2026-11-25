import { withLibraryLock } from '#/features/storage/library-lock';
import { getLibraryStore } from '#/features/storage/library-store';

import {
  fontSampleSchema,
  isSameFontStyle,
  loadFontFace,
  parseFontFileName,
  sortFontFaces,
  toFontStyleName,
} from './font-source';
import type {
  FontSourceContent,
  FontSourceFace,
  FontSourceFile,
  FontSourceGroup,
  FontSourceResult,
} from './font-source.type';
import { deleteMediaFile, writeMediaFile } from './source-media';
import type { Source } from './source-types';
import { MAX_NAME_LENGTH, sourceFileSchema } from './source-types';

/** One source for the whole family. A bad file is skipped, and the rest still save. */
export async function createFontSource(
  group: FontSourceGroup,
  collectionId: string | null,
): Promise<FontSourceResult> {
  const { faces, error } = await saveFontFaces(group.family, group.files, []);
  if (faces.length === 0) throw error;

  const now = new Date().toISOString();
  const source: Source = {
    id: crypto.randomUUID(),
    name: group.family.slice(0, MAX_NAME_LENGTH),
    url: null,
    note: null,
    tags: [],
    collectionIds: collectionId ? [collectionId] : [],
    kind: 'font',
    font: {
      family: group.family,
      sample: null,
      coverFace: null,
      faces: sortFontFaces(faces),
    },
    fileName: '',
    mimeType: '',
    sizeBytes: sumSize(faces),
    width: null,
    height: null,
    durationSeconds: null,
    storageKey: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  try {
    await getLibraryStore().putSources([source]);
  } catch (saveError) {
    await deleteFontFiles(faces.map((face) => face.storageKey));
    throw new Error(`Failed to save "${group.family}".`, { cause: saveError });
  }

  return { source, error };
}

// *** saveFontFaces ***
// One at a time, so a big family never holds every file in memory at once.
async function saveFontFaces(
  family: string,
  files: FontSourceFile[],
  existing: FontSourceFace[],
): Promise<{ faces: FontSourceFace[]; error: unknown }> {
  const faces: FontSourceFace[] = [];
  let error: unknown;

  for (const { file, weight, style } of files) {
    try {
      if (
        [...existing, ...faces].some((face) =>
          isSameFontStyle(face, { weight, style }),
        )
      ) {
        throw new Error(
          `${family} ${toFontStyleName({ weight, style })} is already in this font.`,
        );
      }
      sourceFileSchema.parse(file);
      // Loading is the only check that the file really is a font the browser can draw.
      await loadFontFace(family, await file.arrayBuffer());
      const storageKey = crypto.randomUUID();
      await writeMediaFile(storageKey, file).catch(async (writeError) => {
        // A failed write can still leave a half-written file behind.
        await deleteFontFiles([storageKey]);
        throw writeError;
      });
      faces.push({
        storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        weight,
        style,
      });
    } catch (fileError) {
      error ??= fileError;
    }
  }

  return { faces, error };
}

// *** sumSize ***
function sumSize(faces: FontSourceFace[]): number {
  return faces.reduce((sum, face) => sum + face.sizeBytes, 0);
}

// *** deleteFontFiles ***
// A leftover file only wastes space, so one failure does not stop the rest.
async function deleteFontFiles(storageKeys: string[]): Promise<void> {
  await Promise.all(
    storageKeys.map((storageKey) =>
      deleteMediaFile(storageKey).catch((error: unknown) => {
        console.error(`Failed to delete font file: ${storageKey}`, error);
      }),
    ),
  );
}

/**
 * Files join this family even when their names say another family. Their
 * weight and style still come from the name.
 */
export async function addFontFaces(
  id: string,
  files: File[],
): Promise<FontSourceResult> {
  const before = await readFont(id);
  const parsed = files.map((file) => ({
    file,
    ...parseFontFileName(file.name),
  }));
  const saved = await saveFontFaces(
    before.font.family,
    parsed,
    before.font.faces,
  );
  if (saved.faces.length === 0) throw saved.error;

  try {
    return await withLibraryLock(async () => {
      // Read again: another tab may have added the same style meanwhile.
      const current = await readFont(id);
      const added = saved.faces.filter(
        (face) => !current.font.faces.some((old) => isSameFontStyle(old, face)),
      );
      const faces = sortFontFaces([...current.font.faces, ...added]);
      const source = await saveFont(current, { faces }, sumSize(faces));
      const late = saved.faces.filter((face) => !added.includes(face));
      await deleteFontFiles(late.map((face) => face.storageKey));

      return {
        source,
        error: saved.error ?? toLateDuplicateError(current.font.family, late),
      };
    });
  } catch (error) {
    // The source is gone or did not save, so no record points to these files.
    await deleteFontFiles(saved.faces.map((face) => face.storageKey));
    throw error;
  }
}

// *** toLateDuplicateError ***
// Another tab added the same style while these files were saving.
function toLateDuplicateError(
  family: string,
  late: FontSourceFace[],
): Error | undefined {
  const face = late.at(0);
  if (!face) return undefined;

  return new Error(
    `${family} ${toFontStyleName(face)} is already in this font.`,
  );
}

/** The last style can't go: a font with no file is a card that never loads. */
export async function removeFontFace(
  id: string,
  storageKey: string,
): Promise<Source> {
  const source = await withLibraryLock(async () => {
    const current = await readFont(id);
    // Never delete a file this font does not own.
    if (!current.font.faces.some((face) => face.storageKey === storageKey)) {
      throw new Error('That style is no longer in this font.');
    }
    if (current.font.faces.length === 1) {
      throw new Error('A font needs at least one style.');
    }
    const faces = current.font.faces.filter(
      (face) => face.storageKey !== storageKey,
    );
    const coverFace =
      current.font.coverFace === storageKey ? null : current.font.coverFace;

    return saveFont(current, { faces, coverFace }, sumSize(faces));
  });

  // After the save, so a failed save never loses the file.
  await deleteFontFiles([storageKey]);

  return source;
}

export async function updateFontSample(
  id: string,
  text: string,
): Promise<Source> {
  const sample = fontSampleSchema.parse(text);

  return withLibraryLock(async () => saveFont(await readFont(id), { sample }));
}

export async function updateFontCover(
  id: string,
  storageKey: string,
): Promise<Source> {
  return withLibraryLock(async () => {
    const current = await readFont(id);
    if (!current.font.faces.some((face) => face.storageKey === storageKey)) {
      throw new Error('That style is no longer in this font.');
    }

    return saveFont(current, { coverFace: storageKey });
  });
}

// *** readFont ***
async function readFont(
  id: string,
): Promise<Source & { font: FontSourceContent }> {
  const source = await getLibraryStore().getSource(id);
  if (!source) throw new Error(`Source not found: ${id}`);
  if (!source.font) throw new Error('Only fonts have styles.');

  return { ...source, font: source.font };
}

// *** saveFont ***
async function saveFont(
  current: Source & { font: FontSourceContent },
  change: Partial<FontSourceContent>,
  sizeBytes = current.sizeBytes,
): Promise<Source> {
  const source: Source = {
    ...current,
    font: { ...current.font, ...change },
    sizeBytes,
    updatedAt: new Date().toISOString(),
  };
  await getLibraryStore().putSources([source]);

  return source;
}
