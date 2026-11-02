import { useEffect, useState } from 'react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';

import {
  useDesktopBridge,
  useLibraryFolder,
} from '#/features/desktop/desktop-hooks';
import type { SettingsStorageSectionProps } from '#/features/settings/settings.type';
import { formatBytes } from '#/features/storage/storage-usage';

const STORAGE_TITLE_ID = 'settings-storage-title';

const PART_COLORS = {
  videos: 'bg-accent',
  images: 'bg-muted-fg',
  other: 'bg-border',
};

export function SettingsStorageSection({
  breakdown,
}: SettingsStorageSectionProps) {
  const grown = useGrownAfterPaint();
  const isDesktop = useDesktopBridge() !== undefined;
  // On desktop every file is a source, so an empty "Other" row would only confuse.
  const listedParts = isDesktop
    ? breakdown.parts.filter((part) => part.kind !== 'other')
    : breakdown.parts;

  return (
    <section aria-labelledby={STORAGE_TITLE_ID} className="space-y-4">
      <h3 id={STORAGE_TITLE_ID} className="t-l-2">
        Storage
      </h3>
      {isDesktop && <LibraryFolderRow />}
      <p className="t-h-5 tabular-nums">
        {formatBytes(breakdown.total)}
        {breakdown.quota != null && (
          <span className="ml-2 t-b-3 text-muted-fg">
            of {formatBytes(breakdown.quota)} available
          </span>
        )}
      </p>
      <div
        aria-hidden
        className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-border/60"
      >
        {breakdown.parts
          .filter((part) => part.bytes > 0)
          .map((part) => (
            <div
              key={part.kind}
              className={cn(
                'origin-left transition-transform duration-500 ease-out motion-reduce:transition-none',
                PART_COLORS[part.kind],
              )}
              style={{
                flexGrow: part.bytes,
                transform: `scaleX(${grown ? 1 : 0})`,
              }}
            />
          ))}
      </div>
      <ul className="space-y-2 t-b-3 tabular-nums">
        {listedParts.map((part) => (
          <li key={part.kind} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn('size-2 rounded-full', PART_COLORS[part.kind])}
            />
            <span className="flex-1">{part.label}</span>
            <span className="text-muted-fg">{formatBytes(part.bytes)}</span>
          </li>
        ))}
      </ul>
      <p className="t-b-3 text-muted-fg">
        {isDesktop
          ? 'Everything is saved in your library folder.'
          : 'Everything is saved on this device. Other is previews, thumbnails and app data.'}
      </p>
    </section>
  );
}

// *** LibraryFolderRow ***
function LibraryFolderRow() {
  const { folder, chooseFolder, choosing, revealFolder } = useLibraryFolder();

  return (
    <div className="space-y-2">
      <p className="t-l-3 text-muted-fg">Library folder</p>
      <p className="t-b-3 break-all">{folder?.path ?? 'Not chosen yet'}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={chooseFolder}
          disabled={choosing}
        >
          Change folder
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={revealFolder}
          disabled={!folder?.path}
        >
          Show in Finder
        </Button>
      </div>
    </div>
  );
}

// *** useGrownAfterPaint ***
// The bar must paint empty first, or there is nothing to grow from.
function useGrownAfterPaint() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return grown;
}
