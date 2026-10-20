import { useSyncExternalStore } from 'react';
import { useIsMutating, useMutation } from '@tanstack/react-query';

import { toast } from '@repo/ui/sonner';

import type { ExportProgress, ExportResult } from './export.type';
import { exportLibrary } from './export-actions';
import { toExportName } from './export-layout';
import { openExportTarget } from './export-target';

const EXPORT_MUTATION_KEY = ['export-library'] as const;

const EXPORT_ERROR_MESSAGES = {
  space: 'Not enough space to build the zip. Free some space and try again.',
  blocked:
    'The browser did not allow saving the file. Try again and pick another folder.',
  unknown: 'Could not export your library. Please try again.',
};

/** Callbacks live on the mutation, so the toast still shows after the settings close. */
export function useExportLibrary() {
  const progress = useSyncExternalStore(
    subscribeToProgress,
    () => currentProgress,
    () => null,
  );
  // Reopening the settings mid-export still shows it as busy.
  const exporting = useIsMutating({ mutationKey: EXPORT_MUTATION_KEY }) > 0;

  const { mutate } = useMutation({
    mutationKey: EXPORT_MUTATION_KEY,
    // Export never touches the network. The default would pause it offline and
    // run it later without a click, when the save picker is no longer allowed.
    networkMode: 'always',
    mutationFn: async () => {
      const exportedAt = new Date();
      const target = await openExportTarget(`${toExportName(exportedAt)}.zip`);
      return exportLibrary(target, exportedAt, setProgress);
    },
    onSuccess: (result) => toast.success(toExportMessage(result)),
    onError: (error) => {
      const message = toExportErrorMessage(error);
      if (!message) return;
      console.error('Failed to export the library', error);
      toast.error(message);
    },
    onSettled: () => setProgress(null),
  });

  return { startExport: () => mutate(), exporting, progress };
}

// Outside React, so a Data tab opened again mid-export still shows the bar.
let currentProgress: ExportProgress | null = null;
const progressListeners = new Set<() => void>();

// *** subscribeToProgress ***
function subscribeToProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

// *** setProgress ***
function setProgress(progress: ExportProgress | null) {
  currentProgress = progress;
  progressListeners.forEach((listener) => listener());
}

// *** toExportMessage ***
function toExportMessage({ sourceCount, missingCount }: ExportResult): string {
  const exported = `Exported ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}.`;
  if (missingCount === 0) return exported;

  const missing =
    missingCount === 1
      ? '1 file was missing.'
      : `${missingCount} files were missing.`;
  return `${exported} ${missing}`;
}

// *** toExportErrorMessage ***
// Raw browser errors mean nothing to users, so only the ones we can explain get their own text.
function toExportErrorMessage(error: unknown): string | null {
  const name = error instanceof Error ? error.name : '';
  if (name === 'AbortError') return null;
  if (name === 'QuotaExceededError') return EXPORT_ERROR_MESSAGES.space;
  if (name === 'NotAllowedError') return EXPORT_ERROR_MESSAGES.blocked;
  return EXPORT_ERROR_MESSAGES.unknown;
}

export { toExportErrorMessage, toExportMessage };
