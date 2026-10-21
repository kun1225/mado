import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const count = useDraggedFileCount();
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  useCenterOnVisibleArea(isDragActive, gridRef, cardRef);

  return (
    <div
      {...getRootProps({
        className: cn('group relative', className),
        'data-drag-active': isDragActive || undefined,
      })}
    >
      {/* Scaled only while dragging: a transform makes fixed children (like the selection bar) scroll with the grid. */}
      <div
        ref={gridRef}
        className="flex grow flex-col transition-[scale] duration-base ease-out-quart group-data-drag-active:scale-96 group-data-drag-active:duration-slow motion-reduce:group-data-drag-active:scale-100"
      >
        {children}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-xl bg-bg/55 opacity-0 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-fg)_6%,transparent)] backdrop-blur-xs transition-opacity duration-base ease-out-quart group-data-drag-active:opacity-100 group-data-drag-active:duration-slow"
      />

      {/* Outside the veil: its backdrop-filter would pin a fixed child to the veil instead of the screen. */}
      <div
        ref={cardRef}
        aria-hidden
        className="pointer-events-none fixed left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex w-80 max-w-[calc(100vw-2rem)] scale-96 flex-col items-center rounded-2xl border border-border bg-bg px-6 pt-6 pb-5 text-center opacity-0 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.08),0_24px_48px_rgb(0_0_0/0.06)] transition-[scale,opacity] duration-base ease-out-quart group-data-drag-active:scale-100 group-data-drag-active:opacity-100 group-data-drag-active:duration-slow motion-reduce:scale-100">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-fg">
            <HugeiconsIcon icon={Download04Icon} size={20} strokeWidth={1.5} />
          </span>
          <p className="mt-4 line-clamp-2 text-base font-medium text-balance text-fg">
            {toDropTitle(label, count)}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Images and videos, up to {MAX_FILE_MB} MB each
          </p>
        </div>
      </div>
    </div>
  );
}

// *** useDraggedFileCount ***
// Browsers only reveal file names on drop, but the item count is readable during the drag.
function useDraggedFileCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function handleDragEnter(event: DragEvent) {
      const items = event.dataTransfer?.items;
      if (!items) return;
      setCount([...items].filter((item) => item.kind === 'file').length);
    }

    window.addEventListener('dragenter', handleDragEnter);
    return () => window.removeEventListener('dragenter', handleDragEnter);
  }, []);

  return count;
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
    if (!isActive || !grid || !card) return;

    const rect = grid.getBoundingClientRect();
    const centerY =
      (Math.max(rect.top, 0) + Math.min(rect.bottom, window.innerHeight)) / 2;
    card.style.top = `${centerY}px`;
    grid.style.transformOrigin = `50% ${centerY - rect.top}px`;
  }, [isActive, gridRef, cardRef]);
}

// *** toDropTitle ***
function toDropTitle(label: string, count: number) {
  if (count > 1) return `Add ${count} files to ${label}`;
  return `Drop to add to ${label}`;
}
