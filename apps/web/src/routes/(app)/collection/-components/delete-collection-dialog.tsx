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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{collection.name}”?</AlertDialogTitle>

          <AlertDialogDescription>
            {collection.saveCount > 0
              ? `This collection and its ${collection.saveCount} ${saveLabel} move to the trash. The collection cannot be brought back.`
              : 'This collection is deleted for good and cannot be brought back.'}
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
      </AlertDialogContent>
    </AlertDialog>
  );
}
