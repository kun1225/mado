import { useState } from 'react';
import type { KeyboardEvent } from 'react';

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
import { Button } from '@repo/ui/button';

import { useUpdateSourceText } from '#/features/sources/hooks/source-hooks';
import type { Source } from '#/features/sources/source-types';
import { textBodySchema } from '#/features/sources/text-source';
import type { TextSourceContent } from '#/features/sources/text-source.type';

import { SourceTextDocument } from '../source-text';

/**
 * The draft belongs to one source, so moving to another source drops it
 * without an effect. The dialog asks before it lets that happen.
 */
export function useSourceTextEditor(source: Source | undefined) {
  const [draft, setDraft] = useState<{ id: string; body: string } | null>(null);
  const { mutate: save, isPending: isSaving } = useUpdateSourceText();
  const body = draft !== null && draft.id === source?.id ? draft.body : null;
  const isDirty = body !== null && body !== source?.text?.body;

  return {
    draft: body,
    isDirty,
    isSaving,
    start: () => {
      if (source?.text) setDraft({ id: source.id, body: source.text.body });
    },
    change: (next: string) => {
      if (source) setDraft({ id: source.id, body: next });
    },
    stop: () => setDraft(null),
    save: () => {
      if (source === undefined || body === null) return;
      save({ id: source.id, body }, { onSuccess: () => setDraft(null) });
    },
  };
}

export type SourceTextEditor = ReturnType<typeof useSourceTextEditor>;

export function SourceDetailTextViewer({
  text,
  editor,
  onCancel,
  mediaRef,
}: {
  text: TextSourceContent;
  editor: SourceTextEditor;
  onCancel: () => void;
  mediaRef: (media: HTMLElement | null) => void;
}) {
  return (
    <div className="pointer-events-none flex min-h-0 min-w-0 flex-1 justify-center">
      {/* The whole sheet flies from the card, so its first line lands where the card's was. */}
      <div
        ref={mediaRef}
        className="pointer-events-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-md bg-bg text-fg"
      >
        {editor.draft === null ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:py-12">
            <SourceTextDocument text={text} className="mx-auto max-w-[68ch]" />
          </div>
        ) : (
          <SourceDetailTextEditor
            draft={editor.draft}
            isDirty={editor.isDirty}
            isSaving={editor.isSaving}
            onChange={editor.change}
            onSave={editor.save}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

// *** SourceDetailTextEditor ***
// Raw text, not a rich editor, so the file the user downloads is exactly what they typed.
function SourceDetailTextEditor({
  draft,
  isDirty,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: string;
  isDirty: boolean;
  isSaving: boolean;
  onChange: (body: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const result = textBodySchema.safeParse(draft);
  const error = result.success ? null : result.error.issues[0]?.message;
  const canSave = isDirty && !error && !isSaving;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
      // Otherwise the browser saves the whole page.
      event.preventDefault();
      if (canSave) onSave();
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
        <p className="t-b-4 text-muted-fg">
          {error ?? (isDirty ? 'Unsaved changes' : 'Editing')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!canSave}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <textarea
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={isSaving}
        aria-label="Text"
        aria-invalid={error !== null}
        autoFocus
        spellCheck
        className="min-h-0 flex-1 resize-none bg-transparent px-6 py-6 t-b-2 font-mono outline-none sm:px-12 md:t-b-3"
      />
    </>
  );
}

export function SourceDetailDiscardDialog({
  open,
  onKeepEditing,
  onDiscard,
}: {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onKeepEditing();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits to this text have not been saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-danger text-danger-fg hover:bg-danger/90"
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
