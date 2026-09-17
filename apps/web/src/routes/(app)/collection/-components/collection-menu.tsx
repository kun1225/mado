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

export function CollectionMenu() {
  return (
    <MorphDropdownMenu>
      <MorphDropdownMenuTrigger
        aria-label="Collection options"
        className="text-muted-fg hover:text-fg data-popup-open:text-fg size-8 border-transparent bg-transparent p-0"
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} strokeWidth={2} />
      </MorphDropdownMenuTrigger>

      <MorphDropdownMenuContent align="start" className="min-w-52">
        <MorphDropdownMenuItem>
          <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={1.5} />
          Rename
        </MorphDropdownMenuItem>

        <MorphDropdownMenuItem variant="danger">
          <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
          Delete collection
        </MorphDropdownMenuItem>
      </MorphDropdownMenuContent>
    </MorphDropdownMenu>
  );
}
