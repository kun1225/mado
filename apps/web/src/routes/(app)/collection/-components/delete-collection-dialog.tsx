import { Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';

import type { Collection } from '#/features/collections/collection-types';

export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  isError,
}: {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  isError?: boolean;
}) {
  const saveLabel = collection.saveCount === 1 ? 'save' : 'saves';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-0 p-1">
        <div
          className={cn(
            'relative flex min-h-40 items-end justify-center overflow-hidden rounded-md bg-(image:--poise-gradient-danger-cover) px-6',
            'before:absolute before:bottom-0 before:left-2 before:size-4 before:rounded-md before:bg-transparent before:shadow-[8px_8px_0px_0px_var(--color-bg)]',
            'after:absolute after:right-2 after:bottom-0 after:size-4 after:rounded-md after:bg-transparent after:shadow-[-8px_8px_0px_0px_var(--color-bg)]',
          )}
        >
          <div className="relative w-full rounded-t-md bg-bg px-4 pt-8 pb-4 text-center">
            <span
              aria-hidden="true"
              className="absolute top-0 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full bg-bg text-danger ring-4 ring-bg"
            >
              <HugeiconsIcon icon={Delete02Icon} size={22} strokeWidth={1.5} />
            </span>

            <p className="text-sm font-medium text-pretty break-all">
              {collection.name}
            </p>

            <p className="mt-1 text-xs text-muted-fg tabular-nums">
              {collection.saveCount.toLocaleString()} {saveLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this collection?</AlertDialogTitle>

            <AlertDialogDescription>
              {collection.saveCount > 0
                ? 'The collection and its saves move to the trash. You cannot get them back.'
                : 'You cannot get this collection back'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isError && (
            <p className="text-sm text-danger">
              Failed to delete the collection. Please try again.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              disabled={isDeleting}
              onClick={onConfirm}
              className="bg-danger text-danger-fg hover:bg-danger/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete collection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
