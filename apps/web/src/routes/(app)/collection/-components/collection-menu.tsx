import { useState } from 'react';
import {
  Delete02Icon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  MorphDropdownMenu,
  MorphDropdownMenuContent,
  MorphDropdownMenuItem,
  MorphDropdownMenuTrigger,
} from '@repo/ui/morph-dropdown-menu';

import type { Collection } from '#/features/collections/collection-types';

import { DeleteCollectionDialog } from './delete-collection-dialog';

export function CollectionMenu({
  collection,
  onDelete,
  isDeleting,
  isDeleteError,
}: {
  collection: Collection;
  onDelete: () => void;
  isDeleting?: boolean;
  isDeleteError?: boolean;
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <MorphDropdownMenu>
        <MorphDropdownMenuTrigger
          aria-label="Collection options"
          className="size-8 border-transparent bg-transparent p-0 text-muted-fg hover:text-fg data-popup-open:text-fg"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={18} strokeWidth={2} />
        </MorphDropdownMenuTrigger>

        <MorphDropdownMenuContent align="start" className="min-w-52">
          <MorphDropdownMenuItem>
            <HugeiconsIcon
              icon={PencilEdit02Icon}
              size={16}
              strokeWidth={1.5}
            />
            Rename
          </MorphDropdownMenuItem>

          <MorphDropdownMenuItem
            variant="danger"
            onClick={() => setIsConfirmOpen(true)}
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
            Delete collection
          </MorphDropdownMenuItem>
        </MorphDropdownMenuContent>
      </MorphDropdownMenu>

      <DeleteCollectionDialog
        collection={collection}
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={onDelete}
        isDeleting={isDeleting}
        isError={isDeleteError}
      />
    </>
  );
}
