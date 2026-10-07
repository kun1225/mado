import { useRef, useState } from 'react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  SidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { KeyboardEvent } from 'react';

import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@repo/ui/dialog';

import {
  useCompressingSourceIds,
  useDeleteSource,
  useMediaObjectUrl,
} from '#/features/sources/hooks/source-hooks';
import { resolveSourceDetail } from '#/features/sources/hooks/source-interaction-hooks';
import {
  downloadSource,
  isEditablePasteTarget,
} from '#/features/sources/source-media';
import type { Source } from '#/features/sources/source-types';

import { SourceDetailPanel } from './source-detail-panel';

export function SourceDetailDialog({
  sources,
  activeId,
  onActiveIdChange,
}: {
  sources: Source[];
  activeId: string | null;
  onActiveIdChange: (id: string | null) => void;
}) {
  const deleteSourceMutation = useDeleteSource();
  // On a phone the panel covers the image, so it starts closed there.
  const [isPanelOpen, setIsPanelOpen] = useState(
    () => window.matchMedia('(min-width: 768px)').matches,
  );
  const view = resolveSourceDetail(sources, activeId);

  // Keeps the last source on screen while the dialog fades out.
  const lastSource = useRef<Source | undefined>(undefined);
  if (view.source) lastSource.current = view.source;
  const source = view.source ?? lastSource.current;

  const previousId = view.previous?.id;
  const nextId = view.next?.id;

  if (source === undefined) return null;

  function handleKeyDown(event: KeyboardEvent) {
    if (view.source === undefined || isEditablePasteTarget(event.target))
      return;

    const targetId =
      event.key === 'ArrowLeft'
        ? previousId
        : event.key === 'ArrowRight'
          ? nextId
          : undefined;

    if (targetId !== undefined) onActiveIdChange(targetId);
  }

  function handleDelete() {
    if (source === undefined) return;

    deleteSourceMutation.mutate(source.id, {
      onSuccess: () => onActiveIdChange(null),
    });
  }

  function handleDownload() {
    if (source === undefined) return;

    downloadSource(source).catch((error: unknown) => {
      console.error(`Failed to download "${source.fileName}"`, error);
    });
  }

  return (
    <Dialog
      open={view.source !== undefined}
      onOpenChange={(isOpen) => {
        if (!isOpen) onActiveIdChange(null);
      }}
    >
      <DialogContent
        className="flex flex-col"
        onBackdropClick={() => onActiveIdChange(null)}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">{source.name}</DialogTitle>

        <SourceDetailToolbar
          position={view.index + 1}
          total={sources.length}
          onPrevious={
            previousId ? () => onActiveIdChange(previousId) : undefined
          }
          onNext={nextId ? () => onActiveIdChange(nextId) : undefined}
          onDownload={source.kind === 'website' ? undefined : handleDownload}
          onDelete={handleDelete}
          isDeleting={deleteSourceMutation.isPending}
          isPanelOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen((isOpen) => !isOpen)}
        />

        <div className="pointer-events-none relative flex min-h-0 flex-1 px-edge pb-4">
          <SourceDetailViewer key={`viewer-${source.id}`} source={source} />
          <SourceDetailPanel
            key={`panel-${source.id}`}
            source={source}
            isOpen={isPanelOpen}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hover must stay light-on-dark: the default ghost hover assumes a light page.
const TOOLBAR_BUTTON =
  'text-bg hover:bg-bg/15 hover:text-bg aria-expanded:bg-bg/15 aria-expanded:text-bg';

// *** SourceDetailToolbar ***
function SourceDetailToolbar({
  position,
  total,
  onPrevious,
  onNext,
  onDownload,
  onDelete,
  isDeleting,
  isPanelOpen,
  onTogglePanel,
}: {
  position: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
  onDownload?: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}) {
  return (
    <header className="pointer-events-auto flex h-12 shrink-0 items-center gap-2 px-edge text-bg">
      <Button
        variant="ghost"
        size="icon-sm"
        className={TOOLBAR_BUTTON}
        aria-label="Previous source"
        disabled={!onPrevious}
        onClick={onPrevious}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
      </Button>
      <span className="text-xs tabular-nums">
        {position} / {total}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className={TOOLBAR_BUTTON}
        aria-label="Next source"
        disabled={!onNext}
        onClick={onNext}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {onDownload && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={TOOLBAR_BUTTON}
            aria-label="Download"
            onClick={onDownload}
          >
            <HugeiconsIcon icon={Download01Icon} size={18} strokeWidth={1.5} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className={TOOLBAR_BUTTON}
          aria-label="Delete"
          disabled={isDeleting}
          onClick={onDelete}
        >
          <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isPanelOpen ? 'Hide details' : 'Show details'}
          aria-expanded={isPanelOpen}
          className={TOOLBAR_BUTTON}
          onClick={onTogglePanel}
        >
          <HugeiconsIcon icon={SidebarRightIcon} size={18} strokeWidth={1.5} />
        </Button>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close"
              className={TOOLBAR_BUTTON}
            />
          }
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} />
        </DialogClose>
      </div>
    </header>
  );
}

// *** SourceDetailViewer ***
function SourceDetailViewer({ source }: { source: Source }) {
  const objectUrl = useMediaObjectUrl(
    source.storageKey,
    source.mimeType,
    source.sizeBytes,
  );
  // Compression swaps the stored file, which breaks a video that is playing.
  const isCompressing = useCompressingSourceIds().has(source.id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const isUnplayable = objectUrl !== null && failedUrl === objectUrl;
  const isWaitingForVideo = isCompressing && source.kind === 'video';

  if (source.kind === 'website' && source.site) {
    const embed = source.site.embed;
    return (
      <div className="pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="pointer-events-auto flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-bg/10">
          {embed.mode !== 'none' ? (
            <iframe
              src={embed.src}
              title={source.name}
              sandbox={
                embed.mode === 'provider'
                  ? 'allow-scripts allow-same-origin allow-forms allow-popups'
                  : 'allow-scripts allow-forms allow-popups'
              }
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              className="pointer-events-auto size-full border-0 bg-bg"
            />
          ) : objectUrl ? (
            <img
              src={objectUrl}
              alt={`Preview of ${source.name}`}
              className="pointer-events-auto size-full object-contain"
            />
          ) : (
            <p className="max-w-xs text-center text-sm text-bg/70">
              This website cannot be embedded and has no preview image.
            </p>
          )}
        </div>
        <a
          href={source.url ?? source.site.finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto self-start text-sm text-bg underline underline-offset-4"
        >
          Open original site
        </a>
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex min-h-0 min-w-0 flex-1">
      {objectUrl === null && source.storageKey && !isWaitingForVideo && (
        <div className="m-auto size-24 animate-pulse rounded-md bg-bg/10" />
      )}

      {isWaitingForVideo && (
        <div
          role="status"
          aria-label={`Optimizing ${source.name}`}
          className="m-auto flex size-24 items-center justify-center rounded-md bg-bg/10"
        >
          <span
            aria-hidden
            className="size-6 animate-spin rounded-full border-2 border-bg border-t-transparent motion-reduce:animate-none"
          />
        </div>
      )}

      {isUnplayable && !isCompressing && (
        <p
          role="alert"
          className="m-auto max-w-xs text-center text-sm text-bg/70"
        >
          This video format can't be played in this browser.
        </p>
      )}

      {objectUrl !== null && source.kind === 'image' && (
        <img
          src={objectUrl}
          alt={source.name}
          className="pointer-events-auto size-full object-contain"
        />
      )}

      {objectUrl !== null &&
        source.kind === 'video' &&
        !isCompressing &&
        !isUnplayable && (
          <video
            src={objectUrl}
            onError={() => setFailedUrl(objectUrl)}
            controls
            autoPlay
            loop
            playsInline
            className="pointer-events-auto m-auto max-h-full max-w-full object-contain"
          />
        )}
    </div>
  );
}
