import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';

import { useMediaObjectUrl } from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

import { SourceCardProgressBlur } from './source-card-progress-blur';

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

  const aspectRatio =
    source.width && source.height ? source.width / source.height : 1;

  return (
    <figure
      style={{ aspectRatio }}
      className="group relative overflow-hidden rounded-md"
    >
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
          autoPlay
          muted
          loop
          playsInline
          className="size-full object-cover"
        />
      )}

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${source.fileName}`}
        disabled={isDeleting}
        onClick={() => onDelete(source.id)}
        className="text-danger hover:text-danger hover:bg-bg/70 bg-bg/50 absolute top-1 right-1 opacity-0 backdrop-blur-xs transition-[opacity,background_color] group-hover:opacity-100 focus-visible:opacity-100"
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
      </Button>

      <figcaption className="absolute inset-x-0 bottom-0 pt-4">
        <SourceCardProgressBlur />

        <div className="duration-base ease-standard relative px-2 pt-1 pb-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <p className="text-bg truncate text-xs font-medium">
            {source.fileName}
          </p>

          {collectionName !== undefined && (
            <p className="text-bg/70 truncate text-[0.625rem] leading-tight">
              {collectionName}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
