import { useRef, useState } from 'react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  ImageUpload01Icon,
  SidebarRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';
import type { DragEvent, KeyboardEvent } from 'react';

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
import {
  resolveSourceDetail,
  useIsDraggingFile,
  useReplaceSourceDropzone,
} from '#/features/sources/hooks/source-interaction-hooks';
import {
  downloadSource,
  isEditablePasteTarget,
} from '#/features/sources/source-media';
import type { Source } from '#/features/sources/source-types';
import { canEmbedSite } from '#/features/sources/source-types';

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
  // On a phone the panel covers the image, so it starts closed.
  const [isPanelOpen, setIsPanelOpen] = useState(
    () => window.matchMedia('(min-width: 768px)').matches,
  );
  const view = resolveSourceDetail(sources, activeId);

  // Keep the last source so the dialog is not empty while it fades out.
  const lastSource = useRef<Source | undefined>(undefined);
  if (view.source) lastSource.current = view.source;
  const source = view.source ?? lastSource.current;
  const replace = useReplaceSourceDropzone(source);
  const isDraggingFile = useIsDraggingFile();
  // Read once here, because the viewer and the panel thumbnail show the same file.
  const objectUrl = useMediaObjectUrl(
    source?.storageKey ?? null,
    source?.mimeType ?? '',
    source?.sizeBytes ?? 0,
  );

  const previousId = view.previous?.id;
  const nextId = view.next?.id;

  if (source === undefined) return null;
  const isEmbedded = canEmbedSite(source);
  const replaceLabel = isEmbedded ? 'Replace thumbnail' : 'Replace file';

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
    <div className="contents" {...DROP_BLOCKER}>
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
            onReplace={replace.open}
            replaceLabel={replaceLabel}
            isReplacing={replace.isBusy}
            onDownload={source.kind === 'website' ? undefined : handleDownload}
            onDelete={handleDelete}
            isDeleting={deleteSourceMutation.isPending}
            isPanelOpen={isPanelOpen}
            onTogglePanel={() => setIsPanelOpen((isOpen) => !isOpen)}
          />

          <div className="pointer-events-none relative flex min-h-0 flex-1 px-edge pb-4">
            {/* Only the viewer takes drops, so dropping on the panel fields does not replace the media. */}
            <div
              {...replace.getRootProps({
                className: 'relative flex min-h-0 min-w-0 flex-1',
              })}
            >
              <input {...replace.getInputProps()} />
              <SourceDetailViewer
                key={`viewer-${source.id}`}
                source={source}
                objectUrl={objectUrl}
                onAddImage={replace.open}
              />
              {(replace.isDragActive || (isEmbedded && isDraggingFile)) && (
                <SourceDetailDropOverlay
                  label={`Drop to ${replaceLabel.toLowerCase()}`}
                />
              )}
            </div>
            <SourceDetailPanel
              key={`panel-${source.id}`}
              source={source}
              thumbnailUrl={objectUrl}
              isOpen={isPanelOpen}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// The dialog sits inside the library drop zone, which would add a dropped file as a new source.
// preventDefault also stops the browser from opening the file.
const DROP_BLOCKER = {
  onDragEnter: blockDrag,
  onDragOver: blockDrag,
  onDrop: blockDrag,
};

// *** blockDrag ***
function blockDrag(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'none';
}

// *** SourceDetailDropOverlay ***
function SourceDetailDropOverlay({ label }: { label: string }) {
  return (
    // An embedded page would swallow the drop, so this layer catches it first.
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-accent bg-accent/10">
      <p className="rounded-full bg-accent px-4 py-2 text-sm text-accent-fg">
        {label}
      </p>
    </div>
  );
}

// The default ghost hover expects a light page, but this toolbar sits on dark.
const TOOLBAR_BUTTON =
  'text-bg hover:bg-bg/15 hover:text-bg aria-expanded:bg-bg/15 aria-expanded:text-bg';

// *** SourceDetailToolbar ***
function SourceDetailToolbar({
  position,
  total,
  onPrevious,
  onNext,
  onReplace,
  replaceLabel,
  isReplacing,
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
  onReplace: () => void;
  replaceLabel: string;
  isReplacing: boolean;
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
        <Button
          variant="ghost"
          size="icon-sm"
          className={TOOLBAR_BUTTON}
          aria-label={replaceLabel}
          title={replaceLabel}
          disabled={isReplacing}
          onClick={onReplace}
        >
          <HugeiconsIcon icon={ImageUpload01Icon} size={18} strokeWidth={1.5} />
        </Button>
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
function SourceDetailViewer({
  source,
  objectUrl,
  onAddImage,
}: {
  source: Source;
  objectUrl: string | null;
  onAddImage: () => void;
}) {
  // Compression swaps the stored file, which breaks a video that is playing.
  const isCompressing = useCompressingSourceIds().has(source.id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [isEmbedLoaded, setIsEmbedLoaded] = useState(false);
  const isUnplayable = objectUrl !== null && failedUrl === objectUrl;
  const isWaitingForVideo = isCompressing && source.kind === 'video';

  if (source.kind === 'website' && source.site) {
    const embed = source.site.embed;
    const isTweet = embed.mode !== 'none' && isTweetEmbed(embed.src);
    return (
      <div className="pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="pointer-events-auto relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-bg/10">
          {embed.mode !== 'none' && !isEmbedLoaded && (
            <SourceDetailSpinner
              label={`Loading ${source.name}`}
              className="absolute inset-0 m-auto"
            />
          )}
          {embed.mode !== 'none' ? (
            <iframe
              onLoad={() => setIsEmbedLoaded(true)}
              src={embed.src}
              title={source.name}
              // Without allow-same-origin the page's CORS files fail to load.
              // It is only unsafe for our own origin, which could break out of the sandbox.
              sandbox={
                new URL(embed.src).origin === window.location.origin
                  ? 'allow-scripts allow-forms allow-popups'
                  : 'allow-scripts allow-same-origin allow-forms allow-popups'
              }
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer"
              // Tweet.html shows a scrollbar track but never scrolls. widgets.js hides it too.
              scrolling={isTweet ? 'no' : undefined}
              className={cn(
                'transition-opacity duration-300 motion-reduce:transition-none',
                !isEmbedLoaded && 'opacity-0',
                isTweet
                  ? // The post card is at most 550px wide, with empty space around it.
                    'pointer-events-auto h-full w-full max-w-[550px] border-0'
                  : 'pointer-events-auto size-full border-0 bg-bg',
              )}
            />
          ) : objectUrl ? (
            <img
              src={objectUrl}
              alt={`Preview of ${source.name}`}
              className="pointer-events-auto size-full object-contain"
            />
          ) : (
            <div className="flex max-w-xs flex-col items-center gap-3 text-center text-sm text-bg/70">
              <p>
                This website can't be embedded. Add an image or video to show
                instead.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className={TOOLBAR_BUTTON}
                onClick={onAddImage}
              >
                <HugeiconsIcon
                  icon={ImageUpload01Icon}
                  size={16}
                  strokeWidth={1.5}
                />
                Add a file
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none flex min-h-0 min-w-0 flex-1">
      {objectUrl === null && source.storageKey && !isWaitingForVideo && (
        <div className="m-auto size-24 animate-pulse rounded-md bg-bg/10" />
      )}

      {isWaitingForVideo && (
        <SourceDetailSpinner
          label={`Optimizing ${source.name}`}
          className="m-auto"
        />
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

// *** SourceDetailSpinner ***
function SourceDetailSpinner({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'flex size-24 items-center justify-center rounded-md bg-bg/10',
        className,
      )}
    >
      <span
        aria-hidden
        className="size-6 animate-spin rounded-full border-2 border-bg border-t-transparent motion-reduce:animate-none"
      />
    </div>
  );
}

// *** isTweetEmbed ***
function isTweetEmbed(src: string): boolean {
  return new URL(src).hostname === 'platform.twitter.com';
}
