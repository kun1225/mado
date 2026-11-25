import { useQuery } from '@tanstack/react-query';

import { loadFontFace, toFontFamily } from '../font-source';
import type { FontSourceFace } from '../font-source.type';
import { readMediaFile } from '../source-media';

// By storage key, for the whole session: the card and the viewer share a file,
// and reading it twice would also add it to `document.fonts` twice.
const loaded = new Map<string, Promise<FontFace>>();

/**
 * Loads the files into `document.fonts` under the source's own family name.
 * `family` stays null until every face is ready, so text never jumps between fonts.
 */
export function useFontFaces(
  sourceId: string,
  faces: FontSourceFace[],
  enabled: boolean,
): { family: string | null; failed: boolean } {
  const { isSuccess, isError } = useQuery({
    queryKey: ['font-faces', sourceId, faces.map((face) => face.storageKey)],
    queryFn: () =>
      Promise.all(faces.map((face) => registerFace(sourceId, face))),
    enabled,
    staleTime: Infinity,
    retry: false,
  });

  return { family: isSuccess ? toFontFamily(sourceId) : null, failed: isError };
}

// *** registerFace ***
function registerFace(
  sourceId: string,
  face: FontSourceFace,
): Promise<FontFace> {
  const existing = loaded.get(face.storageKey);
  if (existing) return existing;

  const task = readMediaFile(face.storageKey)
    .then((file) => file.arrayBuffer())
    .then((data) => loadFontFace(toFontFamily(sourceId), data, face))
    .then((fontFace) => {
      document.fonts.add(fontFace);
      return fontFace;
    });
  // Forget a failure, so a later view can try again.
  task.catch(() => loaded.delete(face.storageKey));
  loaded.set(face.storageKey, task);

  return task;
}

/** A removed style must stop drawing, or the browser keeps using it for that weight. */
export function unloadFontFace(storageKey: string): void {
  const task = loaded.get(storageKey);
  loaded.delete(storageKey);
  void task?.then(
    (fontFace) => document.fonts.delete(fontFace),
    () => undefined,
  );
}
