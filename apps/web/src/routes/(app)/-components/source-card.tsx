import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';

import { useMediaObjectUrl } from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

export function SourceCard({
  source,
  collectionName,
  onDelete,
  isDeleting,
}: {
  source: Source;
  collectionName?: string;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}) {
  const objectUrl = useMediaObjectUrl(source.storageKey, source.mimeType);

  return (
    <figure className="group border-border relative aspect-square overflow-hidden rounded-md border">
      {objectUrl === null && (
        <div className="bg-muted size-full animate-pulse" />
      )}

      {objectUrl !== null && source.kind === 'image' && (
        <img
          src={objectUrl}
          alt={source.fileName}
          className="size-full object-cover"
        />
      )}

      {objectUrl !== null && source.kind === 'video' && (
        <video
          src={objectUrl}
          controls
          preload="metadata"
          className="size-full object-cover"
        />
      )}

      <header className="bg-bg/50 absolute inset-x-0 top-0 flex items-center justify-between gap-2 py-1 pr-1 pl-2 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <figcaption className="text-fg truncate text-xs font-medium">
          {collectionName}
        </figcaption>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${source.fileName}`}
          disabled={isDeleting}
          onClick={() => onDelete(source.id)}
          className="text-danger hover:text-danger hover:bg-danger/10 shrink-0"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
        </Button>
      </header>
    </figure>
  );
}
