import { useEffect } from 'react';

import { toast } from '@repo/ui/sonner';

import { useSaveSourcePalette } from '#/features/sources/hooks/source-hooks';
import { readMediaFile } from '#/features/sources/source-media';
import { computePalette } from '#/features/sources/source-palette';
import type { Source } from '#/features/sources/source-types';

/** The main colors of the source's media. A click copies the hex, the value designers paste. */
export function SourceDetailPalette({ source }: { source: Source }) {
  useMissingPalette(source);
  if (!source.palette?.length) return null;

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`Copied ${hex}`);
    } catch {
      toast.error('Could not copy the color.');
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="t-b-4 text-muted-fg">Color palette</h3>
      <div className="flex gap-1.5">
        {source.palette.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`Copy ${hex}`}
            title={hex}
            onClick={() => void copy(hex)}
            style={{ backgroundColor: hex }}
            className="size-6 rounded-sm ring-1 ring-border ring-inset hover:scale-110 motion-reduce:hover:scale-100"
          />
        ))}
      </div>
    </section>
  );
}

// *** useMissingPalette ***
// Computed on first view, not on upload, so old sources get colors too with only one code path.
function useMissingPalette(source: Source) {
  const { mutate: savePalette } = useSaveSourcePalette();
  const { id, storageKey, fileName, mimeType } = source;
  const isMissing = source.palette === undefined && storageKey !== null;

  useEffect(() => {
    if (!isMissing) return;
    let isCurrent = true;

    readMediaFile(storageKey)
      // OPFS keeps neither name nor type, and the palette needs the type to spot a video.
      .then((stored) =>
        computePalette(new File([stored], fileName, { type: mimeType })),
      )
      .then((palette) => {
        if (isCurrent) savePalette({ id, storageKey, palette });
      })
      // No palette is fine: the row stays hidden and the next view tries again.
      .catch((error: unknown) =>
        console.error(`Failed to read the colors of "${fileName}"`, error),
      );

    return () => {
      isCurrent = false;
    };
  }, [id, storageKey, fileName, mimeType, isMissing, savePalette]);
}
