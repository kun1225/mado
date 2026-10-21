import { useEffect, useState } from 'react';
import { cn } from 'cn';

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

  return (
    <section aria-labelledby={STORAGE_TITLE_ID} className="space-y-4">
      <h3 id={STORAGE_TITLE_ID} className="text-sm font-medium">
        Storage
      </h3>
      <p className="text-2xl font-medium tabular-nums">
        {formatBytes(breakdown.total)}
        {breakdown.quota != null && (
          <span className="ml-2 text-sm font-normal text-muted-fg">
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
      <ul className="space-y-2 text-sm tabular-nums">
        {breakdown.parts.map((part) => (
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
      <p className="text-sm text-muted-fg">
        Everything is saved on this device. Other is previews, thumbnails and
        app data.
      </p>
    </section>
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
