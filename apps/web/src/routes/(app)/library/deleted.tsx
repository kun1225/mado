import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { SourceGrid } from '#/components/source-grid';
import {
  useDeletedSources,
  useHardDeleteSources,
  useRestoreSources,
} from '#/features/sources/source-hooks';
import type { Source } from '#/features/sources/source-types';

import { LibraryDeleteDialog } from './-components/library-delete-dialog';

export const Route = createFileRoute('/(app)/library/deleted')({
  component: Deleted,
});

function Deleted() {
  const deletedSourcesQuery = useDeletedSources();
  const hardDeleteSourcesMutation = useHardDeleteSources();
  const restoreSourcesMutation = useRestoreSources();
  // Kept after the dialog closes so the names stay put while it animates out.
  const [pendingSources, setPendingSources] = useState<Source[]>([]);
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

  function handleAskToHardDelete(ids: string[]) {
    const selectedIds = new Set(ids);
    const picked = sources.filter((source) => selectedIds.has(source.id));

    if (picked.length === 0) return;

    hardDeleteSourcesMutation.reset();
    setPendingSources(picked);
    setIsConfirmOpen(true);
  }

  function handleConfirmHardDelete() {
    if (pendingSources.length === 0) return;

    hardDeleteSourcesMutation.mutate(
      pendingSources.map((source) => source.id),
      { onSuccess: () => setIsConfirmOpen(false) },
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <SourceGrid
        sources={sources}
        showCollection
        onDelete={(id) => handleAskToHardDelete([id])}
        onBulkDelete={handleAskToHardDelete}
        onBulkRestore={restoreSourcesMutation.mutate}
        deletingIds={[
          ...(hardDeleteSourcesMutation.isPending
            ? hardDeleteSourcesMutation.variables
            : []),
          ...(restoreSourcesMutation.isPending
            ? restoreSourcesMutation.variables
            : []),
        ]}
        isBulkPending={
          hardDeleteSourcesMutation.isPending ||
          restoreSourcesMutation.isPending
        }
      />

      {pendingSources.length > 0 && (
        <LibraryDeleteDialog
          sources={pendingSources}
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmHardDelete}
          isDeleting={hardDeleteSourcesMutation.isPending}
          isError={hardDeleteSourcesMutation.isError}
        />
      )}
    </div>
  );
}
