import { useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  ImageUpload01Icon,
  PencilEdit02Icon,
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
import { canEmbedSite, isVideoMimeType } from '#/features/sources/source-types';

import { flipSourceDetail } from './source-detail-flip';
import { SourceDetailPanel } from './source-detail-panel';
import {
  SourceDetailDiscardDialog,
  SourceDetailTextViewer,
  useSourceTextEditor,
} from './source-detail-text';

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
  const editor = useSourceTextEditor(source);
  // A close or a move that waits for "Discard your changes?".
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const isDraggingFile = useIsDraggingFile();
  // Read once here, because the viewer and the panel thumbnail show the same file.
  const objectUrl = useMediaObjectUrl(
    source?.storageKey ?? null,
    source?.mimeType ?? '',
    source?.sizeBytes ?? 0,
  );

  const previousId = view.previous?.id;
  const nextId = view.next?.id;

  const [media, setMedia] = useState<HTMLElement | null>(null);
  const [isFlipClosing, setIsFlipClosing] = useState(false);
  // A new object on every open, so reopening the same source flies again.
  const [opening, setOpening] = useState<{ id: string } | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const isDialogOpen = view.source !== undefined;
  if (isDialogOpen !== wasOpen) {
    setWasOpen(isDialogOpen);
    if (view.source) {
      setOpening({ id: view.source.id });
      setIsFlipClosing(false);
    }
  }
  // A text sheet and a live page fill the viewer, so the whole element flies.
  const fillsViewer =
    source !== undefined && (source.kind === 'text' || canEmbedSite(source));
  const aspectRatio =
    !fillsViewer && source?.width && source.height
      ? source.width / source.height
      : null;
  const flipAnchor = source?.kind === 'text' ? 'top' : 'center';

  // Only the source shown first after opening flies from its card; arrow keys
  // swap sources without it. A layout effect, so the media never paints at
  // rest before it jumps to the card.
  const flippedOpening = useRef<{ id: string } | null>(null);
  useLayoutEffect(() => {
    if (!isDialogOpen || media === null || opening === null) return;
    if (opening.id !== source?.id || flippedOpening.current === opening) return;

    const flipOpen = () => {
      flippedOpening.current = opening;
      flipSourceDetail({
        media,
        sourceId: opening.id,
        aspectRatio,
        direction: 'open',
        anchor: flipAnchor,
      });
    };
    // Before its metadata a video has a 300×150 box, which is not where it lands.
    if (
      media instanceof HTMLVideoElement &&
      media.readyState < HTMLMediaElement.HAVE_METADATA
    ) {
      media.addEventListener('loadedmetadata', flipOpen, { once: true });
      return () => media.removeEventListener('loadedmetadata', flipOpen);
    }
    flipOpen();
  }, [isDialogOpen, media, opening, source?.id, aspectRatio, flipAnchor]);

  if (source === undefined) return null;
  const isEmbedded = canEmbedSite(source);
  const isText = source.kind === 'text';
  const replaceLabel = !(isEmbedded || isText)
    ? 'Replace file'
    : source.storageKey
      ? 'Replace thumbnail'
      : 'Add thumbnail';
  const dropLabel = isText
    ? 'Drop a thumbnail or a new text'
    : `Drop to ${replaceLabel.toLowerCase()}`;

  // Leaving drops the draft too, so coming back shows the saved text.
  function guardLeave(leave: () => void) {
    if (editor.isDirty) {
      setPendingLeave(() => leave);
      return;
    }
    editor.stop();
    leave();
  }

  function discardAndLeave() {
    editor.stop();
    pendingLeave?.();
    setPendingLeave(null);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (view.source === undefined || isEditablePasteTarget(event.target))
      return;

    const targetId =
      event.key === 'ArrowLeft'
        ? previousId
        : event.key === 'ArrowRight'
          ? nextId
          : undefined;

    if (targetId !== undefined) {
      guardLeave(() => onActiveIdChange(targetId));
      return;
    }

    const isPlainKey = !event.metaKey && !event.ctrlKey && !event.altKey;
    if (event.key === 'e' && isPlainKey && isText && editor.draft === null) {
      event.preventDefault();
      editor.start();
    }
  }

  function close() {
    guardLeave(closeNow);
  }

  // Runs before the dialog closes, so Base UI's exit wait sees the animations.
  function closeNow() {
    const didFlip =
      media !== null &&
      source !== undefined &&
      flipSourceDetail({
        media,
        sourceId: source.id,
        aspectRatio,
        direction: 'close',
        anchor: flipAnchor,
      });
    setIsFlipClosing(didFlip);
    onActiveIdChange(null);
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
        open={isDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) close();
        }}
      >
        <DialogContent
          // The popup's fade would also fade the media flying back to its card.
          className={cn(
            'flex flex-col',
            isFlipClosing && 'data-closed:animate-none!',
          )}
          onBackdropClick={close}
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">{source.name}</DialogTitle>

          <SourceDetailToolbar
            position={view.index + 1}
            total={sources.length}
            onPrevious={
              previousId
                ? () => guardLeave(() => onActiveIdChange(previousId))
                : undefined
            }
            onNext={
              nextId
                ? () => guardLeave(() => onActiveIdChange(nextId))
                : undefined
            }
            onEdit={isText && editor.draft === null ? editor.start : undefined}
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
              {source.text ? (
                <SourceDetailTextViewer
                  key={`text-${source.id}`}
                  text={source.text}
                  editor={editor}
                  onCancel={() => guardLeave(() => {})}
                  mediaRef={setMedia}
                />
              ) : (
                <SourceDetailViewer
                  key={`viewer-${source.id}`}
                  source={source}
                  objectUrl={objectUrl}
                  onAddImage={replace.open}
                  mediaRef={setMedia}
                />
              )}
              {(replace.isDragActive || (isEmbedded && isDraggingFile)) && (
                <SourceDetailDropOverlay label={dropLabel} />
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
      <SourceDetailDiscardDialog
        open={pendingLeave !== null}
        onKeepEditing={() => setPendingLeave(null)}
        onDiscard={discardAndLeave}
      />
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
  onEdit,
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
  onEdit?: () => void;
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
    <header
      data-flip-chrome
      className="pointer-events-auto flex h-12 shrink-0 items-center gap-2 px-edge text-bg"
    >
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
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={TOOLBAR_BUTTON}
            aria-label="Edit text"
            title="Edit text (E)"
            onClick={onEdit}
          >
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={18}
              strokeWidth={1.5}
            />
          </Button>
        )}
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
  mediaRef,
}: {
  source: Source;
  objectUrl: string | null;
  onAddImage: () => void;
  mediaRef: (media: HTMLElement | null) => void;
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
        <div
          // A live page or an empty frame flies as a whole; a picture flies on its own.
          ref={embed.mode !== 'none' || !objectUrl ? mediaRef : undefined}
          className="pointer-events-auto relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-bg/10"
        >
          {embed.mode !== 'none' && objectUrl && (
            // The thumbnail stands in while the page loads, so the flight carries a picture.
            <SourceDetailMedia
              src={objectUrl}
              mimeType={source.mimeType}
              isPreview
              className={cn(
                'pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-300 motion-reduce:transition-none',
                isEmbedLoaded && 'opacity-0',
              )}
            />
          )}
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
            <SourceDetailMedia
              ref={mediaRef}
              src={objectUrl}
              mimeType={source.mimeType}
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
          ref={mediaRef}
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
            ref={mediaRef}
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

// *** SourceDetailMedia ***
// A website thumbnail can be an image or a video.
function SourceDetailMedia({
  ref,
  src,
  mimeType,
  alt = '',
  isPreview = false,
  className,
}: {
  ref?: (media: HTMLElement | null) => void;
  src: string;
  mimeType: string;
  alt?: string;
  /** A still frame under the loading page, so it never plays or takes focus. */
  isPreview?: boolean;
  className: string;
}) {
  if (!isVideoMimeType(mimeType)) {
    return <img ref={ref} src={src} alt={alt} className={className} />;
  }

  return isPreview ? (
    <video
      ref={ref}
      src={`${src}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      className={className}
    />
  ) : (
    <video
      ref={ref}
      src={src}
      controls
      autoPlay
      loop
      muted
      playsInline
      className={className}
    />
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
