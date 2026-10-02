import { useEffect, useRef, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';

import { resolveSourceDetail } from '#/features/sources/hooks/use-source-detail';
import { isEditablePasteTarget } from '#/features/sources/source-clipboard';
import { downloadSource } from '#/features/sources/source-download';
import { useDeleteSource } from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

import { SourceDetailPanel } from './source-detail-panel';
import { SourceDetailToolbar } from './source-detail-toolbar';
import { SourceDetailViewer } from './source-detail-viewer';

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
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const view = resolveSourceDetail(sources, activeId);

  // Keeps the last source on screen while the dialog fades out.
  const lastSource = useRef<Source | undefined>(undefined);
  if (view.source) lastSource.current = view.source;
  const source = view.source ?? lastSource.current;

  const previousId = view.previous?.id;
  const nextId = view.next?.id;

  useEffect(() => {
    if (view.source === undefined) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditablePasteTarget(event.target)) return;

      const targetId =
        event.key === 'ArrowLeft'
          ? previousId
          : event.key === 'ArrowRight'
            ? nextId
            : undefined;

      if (targetId !== undefined) onActiveIdChange(targetId);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view.source, previousId, nextId, onActiveIdChange]);

  if (source === undefined) return null;

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
      <DialogContent className="flex flex-col">
        <DialogTitle className="sr-only">{source.name}</DialogTitle>

        <SourceDetailToolbar
          position={view.index + 1}
          total={sources.length}
          onPrevious={
            previousId ? () => onActiveIdChange(previousId) : undefined
          }
          onNext={nextId ? () => onActiveIdChange(nextId) : undefined}
          onDownload={handleDownload}
          onDelete={handleDelete}
          isDeleting={deleteSourceMutation.isPending}
          isPanelOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen((isOpen) => !isOpen)}
        />

        <div className="flex min-h-0 flex-1 gap-4 px-4 pb-4">
          <SourceDetailViewer key={`viewer-${source.id}`} source={source} />
          {isPanelOpen && (
            <SourceDetailPanel key={`panel-${source.id}`} source={source} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
