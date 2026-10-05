import { cn } from 'cn';

import { useSourceDropzone } from '#/features/sources/hooks/source-interaction-hooks';

/**
 * Drop media anywhere inside to add it to `collectionId`, or to the library
 * alone when it is null.
 */
export function SourceDropZone({
  collectionId,
  label,
  className,
  children,
}: {
  collectionId: string | null;
  /** Where the files go, shown while dragging: "Drop to add to {label}". */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { getRootProps, isDragActive } = useSourceDropzone(collectionId);

  return (
    <div {...getRootProps({ className: cn('relative', className) })}>
      {children}

      {isDragActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-accent bg-accent/5"
        >
          {/* Fixed, so it stays in view when the grid is taller than the screen. */}
          <p className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-2 text-sm text-accent-fg">
            Drop to add to {label}
          </p>
        </div>
      )}
    </div>
  );
}
