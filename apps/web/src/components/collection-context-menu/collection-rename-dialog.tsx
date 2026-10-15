import { useState } from 'react';

import { Button } from '@repo/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';

import type { Collection } from '#/features/collections/collection-types';
import { MAX_COLLECTION_NAME_LENGTH } from '#/features/collections/collection-types';

type CollectionRenameDialogProps = {
  collection: Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  isSaving: boolean;
  isError: boolean;
};

export function CollectionRenameDialog({
  open,
  onOpenChange,
  ...formProps
}: CollectionRenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex items-center justify-center p-4">
        {/* Mounted only while open, so the draft starts from the latest name. */}
        <CollectionRenameForm
          {...formProps}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

// *** CollectionRenameForm ***
function CollectionRenameForm({
  collection,
  onSave,
  onCancel,
  isSaving,
  isError,
}: Omit<CollectionRenameDialogProps, 'open' | 'onOpenChange'> & {
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(collection.name);
  const name = draft.trim();
  const canSave = name.length > 0 && name !== collection.name && !isSaving;

  // *** handleSubmit ***
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSave) onSave(name);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-xl bg-bg p-6 text-fg shadow-xl"
    >
      <DialogTitle className="text-lg">Rename collection</DialogTitle>

      <label className="mt-5 flex flex-col gap-2 text-sm">
        Name
        <Input
          autoFocus
          required
          maxLength={MAX_COLLECTION_NAME_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          aria-invalid={isError}
        />
      </label>

      {isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Could not rename the collection. Try again.
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
