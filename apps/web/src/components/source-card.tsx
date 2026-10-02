import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';

import type { ToggleSelectOptions } from '#/features/sources/hooks/use-source-selection';
import { useMediaObjectUrl } from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

import { SourceCardCheckbox } from './source-card-checkbox';
import { SourceCardProgressBlur } from './source-card-progress-blur';

export function SourceCard({
  source,
  collectionName,
  deletion,
  selection,
}: {
  source: Source;
  collectionName?: string;
  deletion: {
    isPending?: boolean;
    onDelete: () => void;
  };
  selection: {
    isSelected: boolean;
    isActive: boolean;
    onToggle: (options: ToggleSelectOptions) => void;
  };
}) {
  const objectUrl = useMediaObjectUrl(source.storageKey, source.mimeType);

  const aspectRatio =
    source.width && source.height ? source.width / source.height : 1;

  return (
    <figure
      style={{ aspectRatio }}
      className={cn(
        'group relative overflow-hidden rounded-md select-none',
        'transition-shadow duration-base ease-standard',
        selection.isSelected && 'ring-2 ring-fg ring-offset-2 ring-offset-bg',
      )}
    >
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
          autoPlay
          muted
          loop
          playsInline
          className="size-full object-cover"
        />
      )}

      {selection.isActive && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={(event) => selection.onToggle({ isRange: event.shiftKey })}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      <SourceCardCheckbox
        fileName={source.fileName}
        isSelected={selection.isSelected}
        isSelectionMode={selection.isActive}
        onToggle={selection.onToggle}
      />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${source.fileName}`}
        disabled={deletion.isPending}
        onClick={deletion.onDelete}
        className="absolute top-1 right-1 z-20 border-bg/80 bg-fg/40 text-bg/80 opacity-0 backdrop-blur-xs transition-[opacity,background_color] group-hover:opacity-100 hover:bg-bg/70 hover:text-danger focus-visible:opacity-100"
      >
        <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
      </Button>

      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-4">
        <SourceCardProgressBlur />

        <div className="relative px-2 pt-1 pb-1.5 opacity-0 transition-opacity duration-base ease-standard group-focus-within:opacity-100 group-hover:opacity-100">
          <p className="truncate text-xs font-medium text-bg">
            {source.fileName}
          </p>

          {collectionName !== undefined && (
            <p className="truncate text-[0.625rem] leading-tight text-bg/70">
              {collectionName}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
