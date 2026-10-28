import { useState } from 'react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';

import { CollectionCardPocket } from '#/components/collection-card-pocket';
import type {
  Collection,
  CollectionColor,
} from '#/features/collections/collection-types';
import { COLLECTION_COLORS } from '#/features/collections/collection-types';

type CollectionColorDialogProps = {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (color: CollectionColor | null) => void;
  isSaving: boolean;
  isError: boolean;
};

export function CollectionColorDialog({
  open,
  onOpenChange,
  ...formProps
}: CollectionColorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex items-center justify-center p-4">
        {/* Mounted only while open, so the draft starts from the saved color. */}
        <CollectionColorForm
          {...formProps}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

const COLOR_OPTIONS: (CollectionColor | null)[] = [null, ...COLLECTION_COLORS];

// *** CollectionColorForm ***
function CollectionColorForm({
  collection,
  onSave,
  onCancel,
  isSaving,
  isError,
}: Omit<CollectionColorDialogProps, 'open' | 'onOpenChange'> & {
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(collection.color);
  const canSave = draft !== collection.color && !isSaving;

  // *** handleSubmit ***
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSave) onSave(draft);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl bg-bg p-6 text-fg shadow-xl"
    >
      <DialogTitle>Folder color</DialogTitle>
      <p className="mt-1 truncate t-b-3 text-muted-fg">{collection.name}</p>

      <div className="mt-5 flex justify-center">
        <CollectionCardPocket previews={[]} color={draft} />
      </div>

      <fieldset className="mt-5">
        <legend className="sr-only">Folder color</legend>
        <div className="flex flex-wrap justify-center gap-2">
          {COLOR_OPTIONS.map((color) => (
            <ColorSwatch
              key={color ?? 'default'}
              color={color}
              checked={draft === color}
              onSelect={() => setDraft(color)}
            />
          ))}
        </div>
      </fieldset>

      {isError && (
        <p role="alert" className="mt-4 t-b-3 text-danger">
          Could not change the color. Try again.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

// *** ColorSwatch ***
function ColorSwatch({
  color,
  checked,
  onSelect,
}: {
  color: CollectionColor | null;
  checked: boolean;
  onSelect: () => void;
}) {
  const label = color ? color[0].toUpperCase() + color.slice(1) : 'Default';

  return (
    // A native radio gives arrow-key moves and the checked state for free.
    <label
      title={label}
      style={{
        backgroundColor: color
          ? `var(--poise-color-folder-${color})`
          : 'var(--color-muted)',
      }}
      className={cn(
        'relative grid size-8 cursor-pointer place-items-center rounded-full border border-border text-fg',
        'outline-2 outline-offset-2 outline-transparent transition-[outline-color,scale] duration-fast ease-standard active:scale-95',
        'has-checked:outline-fg has-focus-visible:outline-ring',
      )}
    >
      <input
        type="radio"
        name="collection-color"
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="sr-only">{label}</span>
      {checked && (
        <HugeiconsIcon
          icon={Tick02Icon}
          size={16}
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
    </label>
  );
}
