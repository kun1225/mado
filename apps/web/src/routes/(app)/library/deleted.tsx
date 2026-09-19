import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import {
  useDeletedSources,
  useHardDeleteSource,
} from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';
import { SourceGrid } from '#/routes/(app)/-components/source-grid';

import { HardDeleteSourceDialog } from './-components/hard-delete-source-dialog';

export const Route = createFileRoute('/(app)/library/deleted')({
  component: Deleted,
});

function Deleted() {
  const deletedSourcesQuery = useDeletedSources();
  const hardDeleteSourceMutation = useHardDeleteSource();
  // Kept after the dialog closes so the name stays put while it animates out.
  const [pendingSource, setPendingSource] = useState<Source | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // The store is browser-only, so the first paint has nothing to show yet -
  // staying blank beats flashing "nothing deleted" at someone with a full bin.
  if (deletedSourcesQuery.isPending) return null;

  if (deletedSourcesQuery.isError) {
    return (
      <p className="flex flex-1 items-center justify-center py-6 text-sm text-danger">
        Unable to load deleted sources.
      </p>
    );
  }

  const sources = deletedSourcesQuery.data;

  if (sources.length === 0) {
    return (
      <p className="flex flex-1 items-center justify-center py-6 text-sm text-muted-fg">
        Nothing has been deleted yet.
      </p>
    );
  }

  function handleAskToHardDelete(id: string) {
    const source = sources.find((candidate) => candidate.id === id);

    if (!source) return;

    hardDeleteSourceMutation.reset();
    setPendingSource(source);
    setIsConfirmOpen(true);
  }

  function handleConfirmHardDelete() {
    if (!pendingSource) return;

    hardDeleteSourceMutation.mutate(pendingSource.id, {
      onSuccess: () => setIsConfirmOpen(false),
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <SourceGrid
        sources={sources}
        showCollection
        onDelete={handleAskToHardDelete}
        deletingId={
          hardDeleteSourceMutation.isPending
            ? hardDeleteSourceMutation.variables
            : null
        }
      />

      {pendingSource && (
        <HardDeleteSourceDialog
          source={pendingSource}
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmHardDelete}
          isDeleting={hardDeleteSourceMutation.isPending}
          isError={hardDeleteSourceMutation.isError}
        />
      )}
    </div>
  );
}
