import { useState } from 'react';

import { Button } from '@repo/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';

export function WebsiteUrlDialog({
  open,
  onOpenChange,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string) => void;
  isSaving: boolean;
}) {
  const [url, setUrl] = useState('');

  // *** handleOpenChange ***
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setUrl('');
    onOpenChange(nextOpen);
  }

  // *** handleSubmit ***
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(url.trim());
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-xl bg-bg p-6 text-fg shadow-xl"
        >
          <DialogTitle className="text-lg">Add website</DialogTitle>
          <p className="mt-1 text-sm text-muted-fg">
            Paste a website URL to save it as a source.
          </p>
          <label className="mt-5 flex flex-col gap-2 text-sm">
            Website URL
            <Input
              autoFocus
              type="url"
              inputMode="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Adding…' : 'Add website'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
