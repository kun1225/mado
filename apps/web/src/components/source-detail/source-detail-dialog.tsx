import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';

import { useDeleteSource } from '#/features/sources/hooks/source-hooks';
import { resolveSourceDetail } from '#/features/sources/hooks/source-interaction-hooks';
import {
  downloadSource,
  isEditablePasteTarget,
} from '#/features/sources/source-media';
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
      <DialogContent className="flex flex-col" onKeyDown={handleKeyDown}>
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

        <div className="relative flex min-h-0 flex-1 px-edge pb-4">
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
