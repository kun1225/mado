import { useSyncExternalStore } from 'react';
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { toast } from '@repo/ui/sonner';

import { collectionKeys } from '#/features/collections/collection-hooks';
import {
  sourceKeys,
  useCompressSource,
} from '#/features/sources/hooks/source-hooks';

import type { ImportProgress, ImportResult } from './import.type';
import { importLibrary, isQuotaError } from './import-actions';

const IMPORT_MUTATION_KEY = ['import-library'] as const;

const IMPORT_ERROR_MESSAGES = {
  space:
    'Not enough space to import this folder. Free some space and try again.',
  unknown: 'Could not import this folder. Please try again.',
};

/** Callbacks live on the mutation, so the toast still shows after the settings close. */
export function useImportLibrary() {
  const queryClient = useQueryClient();
  const { mutate: compress } = useCompressSource();
  const progress = useSyncExternalStore(
    subscribeToProgress,
    () => currentProgress,
    () => null,
  );
  // Reopening the settings mid-import still shows it as busy.
  const importing = useIsMutating({ mutationKey: IMPORT_MUTATION_KEY }) > 0;

  const { mutate } = useMutation({
    mutationKey: IMPORT_MUTATION_KEY,
    // Import never touches the network, so going offline must not pause it.
    networkMode: 'always',
    mutationFn: (files: File[]) => importLibrary(files, setProgress),
    onSuccess: (result) => {
      result.newSources.forEach((source) => compress(source));
      toast.success(toImportMessage(result));
    },
    onError: (error) => {
      console.error('Failed to import a folder', error);
      toast.error(toImportErrorMessage(error));
    },
    // Some sources may be saved even when it fails part way.
    onSettled: () => {
      setProgress(null);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceKeys.all }),
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
      ]);
    },
  });

  return {
    startImport: (files: File[]) => mutate(files),
    importing,
    progress,
  };
}

// Outside React, so a Data tab opened again mid-import still shows the bar.
let currentProgress: ImportProgress | null = null;
const progressListeners = new Set<() => void>();

// *** subscribeToProgress ***
function subscribeToProgress(listener: () => void) {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

// *** setProgress ***
function setProgress(progress: ImportProgress | null) {
  currentProgress = progress;
  progressListeners.forEach((listener) => listener());
}

// *** toImportMessage ***
function toImportMessage(result: ImportResult): string {
  const { existingCount, skippedCount, failedCount } = result;
  const notes = [
    toImportedText(result),
    existingCount > 0 &&
      `${existingCount} ${existingCount === 1 ? 'was' : 'were'} already in your library.`,
    skippedCount > 0 &&
      `${toFileCount(skippedCount)} ${skippedCount === 1 ? 'was' : 'were'} skipped.`,
    failedCount > 0 && `${toFileCount(failedCount)} could not be saved.`,
    result.manifestUnreadable &&
      'library.json could not be read, so folders were used instead.',
  ];
  return notes.filter(Boolean).join(' ');
}

// *** toImportedText ***
function toImportedText({ sourceCount, collectionCount }: ImportResult) {
  if (sourceCount === 0 && collectionCount === 0) {
    return 'Nothing new to import.';
  }

  const sources = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`;
  if (collectionCount === 0) return `Imported ${sources}.`;
  return `Imported ${sources} and ${collectionCount} ${collectionCount === 1 ? 'collection' : 'collections'}.`;
}

// *** toFileCount ***
function toFileCount(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`;
}

// *** toImportErrorMessage ***
// Raw browser errors mean nothing to users, so only a full disk gets its own text.
function toImportErrorMessage(error: unknown): string {
  return isQuotaError(error)
    ? IMPORT_ERROR_MESSAGES.space
    : IMPORT_ERROR_MESSAGES.unknown;
}

export { toImportErrorMessage, toImportMessage };
