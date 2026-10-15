import { useState } from 'react';
import {
  Delete02Icon,
  PaintBoardIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  MorphContextMenu,
  MorphContextMenuContent,
  MorphContextMenuItem,
  MorphContextMenuSeparator,
  MorphContextMenuTrigger,
} from '@repo/ui/morph-context-menu';

import {
  useDeleteCollection,
  useUpdateCollection,
} from '#/features/collections/collection-hooks';
import type {
  Collection,
  UpdateCollectionInput,
} from '#/features/collections/collection-types';

import { CollectionColorDialog } from './collection-color-dialog';
import { CollectionDeleteDialog } from './collection-delete-dialog';
import { CollectionRenameDialog } from './collection-rename-dialog';

type OpenDialog = 'rename' | 'color' | 'delete' | null;

/** Every action opens a dialog, so a stray tap after a long press changes nothing. */
export function CollectionContextMenu({
  collection,
  children,
}: {
  collection: Collection;
  children: React.ReactElement;
}) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

  // *** close ***
  function close() {
    setOpenDialog(null);
    // Without this, the last error shows again the next time a dialog opens.
    updateMutation.reset();
    deleteMutation.reset();
  }

  // *** handleOpenChange ***
  function handleOpenChange(open: boolean) {
    // Closing mid-save would reset the mutation and hide a failure.
    const isBusy = updateMutation.isPending || deleteMutation.isPending;
    if (!open && !isBusy) close();
  }

  // *** save ***
  function save(input: UpdateCollectionInput) {
    updateMutation.mutate({ id: collection.id, input }, { onSuccess: close });
  }

  // *** remove ***
  function remove() {
    deleteMutation.mutate(collection.id, { onSuccess: close });
  }

  return (
    <>
      <MorphContextMenu>
        <MorphContextMenuTrigger render={children} />

        <MorphContextMenuContent className="min-w-44">
          <MorphContextMenuItem onClick={() => setOpenDialog('rename')}>
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={16}
              strokeWidth={1.5}
            />
            Rename
          </MorphContextMenuItem>

          <MorphContextMenuItem onClick={() => setOpenDialog('color')}>
            <HugeiconsIcon icon={PaintBoardIcon} size={16} strokeWidth={1.5} />
            Change color
          </MorphContextMenuItem>

          <MorphContextMenuSeparator />

          <MorphContextMenuItem
            variant="danger"
            onClick={() => setOpenDialog('delete')}
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
            Delete
          </MorphContextMenuItem>
        </MorphContextMenuContent>
      </MorphContextMenu>

      <CollectionRenameDialog
        collection={collection}
        open={openDialog === 'rename'}
        onOpenChange={handleOpenChange}
        onSave={(name) => save({ name })}
        isSaving={updateMutation.isPending}
        isError={updateMutation.isError}
      />

      <CollectionColorDialog
        collection={collection}
        open={openDialog === 'color'}
        onOpenChange={handleOpenChange}
        onSave={(color) => save({ color })}
        isSaving={updateMutation.isPending}
        isError={updateMutation.isError}
      />

      <CollectionDeleteDialog
        collection={collection}
        open={openDialog === 'delete'}
        onOpenChange={handleOpenChange}
        onConfirm={remove}
        isDeleting={deleteMutation.isPending}
        isError={deleteMutation.isError}
      />
    </>
  );
}
