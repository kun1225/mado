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
  sources,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  isError,
}: {
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  isError?: boolean;
}) {
  const single = sources.length === 1 ? sources[0] : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {single ? (
              <>
                Delete "
                <span className="break-all underline">{single.fileName}</span>"{' '}
                forever?
              </>
            ) : (
              <>Delete {sources.length} files forever?</>
            )}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {single
              ? 'You cannot get this file back.'
              : 'You cannot get these files back.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isError && (
          <p className="text-sm text-danger">
            {single
              ? 'Failed to delete the file. Please try again.'
              : 'Failed to delete the files. Please try again.'}
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
