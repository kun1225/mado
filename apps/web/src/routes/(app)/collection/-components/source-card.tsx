import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';

import { useMediaObjectUrl } from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

export function SourceCard({
  source,
  onDelete,
  isDeleting,
}: {
  source: Source;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}) {
  const objectUrl = useMediaObjectUrl(source.storageKey, source.mimeType);

  return (
    <figure className="group relative aspect-square overflow-hidden rounded-md border border-border">
      {objectUrl === null && (
        <div className="size-full animate-pulse bg-muted" />
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

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${source.fileName}`}
        disabled={isDeleting}
        onClick={() => onDelete(source.id)}
        className="bg-background/80 absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
      </Button>
    </figure>
  );
}
