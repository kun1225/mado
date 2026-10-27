import { useLayoutEffect, useRef, useState } from 'react';
import { Download04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { useSourceDropzone } from '#/features/sources/hooks/source-interaction-hooks';
import { MAX_FILE_MB } from '#/features/sources/source-types';

export function SourceDropZone({
  collectionId,
  label,
  className,
  children,
}: {
  collectionId: string | null;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { getRootProps, isDragActive } = useSourceDropzone(collectionId);
  const { count, handleDragEnter } = useDraggedFileCount(isDragActive);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useCenterOnVisibleArea(isDragActive, gridRef, cardRef);

  return (
    <div
      {...getRootProps({
        className: cn('group/drop relative', className),
        'data-drag-active': isDragActive || undefined,
        onDragEnterCapture: handleDragEnter,
      })}
    >
      {/* Scaled only while dragging: a transform makes fixed children (like the selection bar) scroll with the grid. */}
      <div
        ref={gridRef}
        className="flex grow flex-col transition-[scale] duration-base ease-out-quart group-data-drag-active/drop:scale-96 group-data-drag-active/drop:duration-slow motion-reduce:group-data-drag-active/drop:scale-100"
      >
        {children}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-edge -inset-y-2 overflow-clip rounded-xl"
      >
        {/* Blur only while dragging: an idle backdrop-filter still keeps a GPU layer alive. */}
        <div className="sticky top-0 h-lvh max-h-full bg-bg/55 opacity-0 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-fg)_6%,transparent)] transition-[opacity,backdrop-filter] duration-base ease-out-quart group-data-drag-active/drop:opacity-100 group-data-drag-active/drop:backdrop-blur-xs group-data-drag-active/drop:duration-slow" />
      </div>

      {/* Outside the veil: its backdrop-filter would pin a fixed child to the veil instead of the screen. */}
      <div
        ref={cardRef}
        aria-hidden
        className="pointer-events-none fixed left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex w-80 max-w-[calc(100vw-2rem)] scale-96 flex-col items-center rounded-2xl border border-border bg-bg px-6 pt-6 pb-5 text-center opacity-0 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.08),0_24px_48px_rgb(0_0_0/0.06)] transition-[scale,opacity] duration-base ease-out-quart group-data-drag-active/drop:scale-100 group-data-drag-active/drop:opacity-100 group-data-drag-active/drop:duration-slow motion-reduce:scale-100">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-fg">
            <HugeiconsIcon icon={Download04Icon} size={20} strokeWidth={1.5} />
          </span>
          <p className="mt-4 line-clamp-2 text-base font-medium text-balance text-fg">
            {toDropTitle(label, count)}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Images, videos and .txt or .md files, up to {MAX_FILE_MB} MB
          </p>
        </div>
      </div>
    </div>
  );
}

// *** useDraggedFileCount ***
// Browsers only reveal file names on drop, but the item count is readable during the drag.
function useDraggedFileCount(isDragActive: boolean) {
  const [count, setCount] = useState(0);

  // dragenter fires for every card the pointer crosses, but the files only change when a new drag comes in.
  function handleDragEnter(event: React.DragEvent) {
    if (isDragActive) return;
    const items = [...event.dataTransfer.items];
    setCount(items.filter((item) => item.kind === 'file').length);
  }

  return { count, handleDragEnter };
}

// *** useCenterOnVisibleArea ***
function useCenterOnVisibleArea(
  isActive: boolean,
  gridRef: React.RefObject<HTMLDivElement | null>,
  cardRef: React.RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const card = cardRef.current;
    // The grid's own box shrinks while dragging; its parent has the same unscaled box.
    const box = grid?.parentElement;
    if (!isActive || !grid || !card || !box) return;

    let frame = 0;

    function place() {
      frame = 0;
      const rect = box!.getBoundingClientRect();
      const centerY =
        (Math.max(rect.top, 0) + Math.min(rect.bottom, window.innerHeight)) / 2;
      card!.style.top = `${centerY}px`;
      grid!.style.transformOrigin = `50% ${centerY - rect.top}px`;
    }

    // Once per frame: scroll can fire several times per frame, and each read after a write forces a layout.
    function schedulePlace() {
      if (frame === 0) frame = requestAnimationFrame(place);
    }

    place();
    window.addEventListener('scroll', schedulePlace, { passive: true });
    window.addEventListener('resize', schedulePlace);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedulePlace);
      window.removeEventListener('resize', schedulePlace);
    };
  }, [isActive, gridRef, cardRef]);
}

// *** toDropTitle ***
function toDropTitle(label: string, count: number) {
  if (count > 1) return `Add ${count} files to ${label}`;
  return `Drop to add to ${label}`;
}
