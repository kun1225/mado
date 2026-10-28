import { useState } from 'react';

import { Button } from '@repo/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';

import { textBodySchema } from '#/features/sources/text-source';

export function MarkdownNoteDialog({
  open,
  onOpenChange,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, body: string) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const parsed = textBodySchema.safeParse(body);
  // An empty box needs no message; the disabled button already says it.
  const error =
    body.trim() && !parsed.success ? parsed.error.issues[0]?.message : null;

  // *** handleOpenChange ***
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTitle('');
      setBody('');
    }
    onOpenChange(nextOpen);
  }

  // *** handleSubmit ***
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (parsed.success) onSubmit(title, body);
  }

  // *** handleKeyDown ***
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xl rounded-xl bg-bg p-6 text-fg shadow-xl"
        >
          <DialogTitle>Add markdown</DialogTitle>
          <p className="mt-1 t-b-3 text-muted-fg">
            Write a note. It is saved as a Markdown source.
          </p>
          <label className="mt-5 flex flex-col gap-2 t-b-3">
            Title (optional)
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled note"
            />
          </label>
          <label className="mt-4 flex flex-col gap-2 t-b-3">
            Note
            <textarea
              autoFocus
              spellCheck
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-invalid={error !== null}
              placeholder="# A heading&#10;&#10;Some thoughts…"
              className="h-64 w-full resize-none rounded-md border border-border bg-transparent px-2.5 py-2 t-b-2 font-mono transition-colors outline-none placeholder:text-muted-fg focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger/20"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 t-b-3 text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !parsed.success}>
              {isSaving ? 'Adding…' : 'Add markdown'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
