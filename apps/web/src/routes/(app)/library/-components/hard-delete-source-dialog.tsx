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

import type { Source } from '#/features/sources/source-types';

export function HardDeleteSourceDialog({
  source,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  isError,
}: {
  source: Source;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  isError?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete "
            <span className="break-all underline">{source.fileName}</span>"{' '}
            forever?
          </AlertDialogTitle>

          <AlertDialogDescription>
            You cannot get this file back.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isError && (
          <p className="text-sm text-danger">
            Failed to delete the file. Please try again.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>

          <AlertDialogAction
            disabled={isDeleting}
            onClick={onConfirm}
            className="bg-danger text-danger-fg hover:bg-danger/90"
          >
            {isDeleting ? 'Deleting…' : 'Delete forever'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
