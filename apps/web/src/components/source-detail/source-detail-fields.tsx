import { useState } from 'react';

import { Input } from '@repo/ui/input';

import { useSourceField } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';

function FieldError({ message }: { message: string | null }) {
  if (message === null) return null;

  return (
    <p role="alert" className="mt-1 text-xs text-danger">
      {message}
    </p>
  );
}

export function SourceDetailFields({ source }: { source: Source }) {
  const name = useSourceField(source, 'name');
  const url = useSourceField(source, 'url');
  const note = useSourceField(source, 'note');
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  function blurOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur();
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-xs text-muted-fg">
        Name
        <Input
          value={name.draft}
          onChange={(event) => name.setDraft(event.target.value)}
          onBlur={name.commit}
          onKeyDown={blurOnEnter}
          aria-invalid={name.error !== null}
          className="h-9 text-base text-fg md:text-sm"
        />
        <FieldError message={name.error} />
      </label>

      <label className="flex flex-col gap-1.5 text-xs text-muted-fg">
        URL
        <Input
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={source.kind === 'website' ? (source.url ?? '') : url.draft}
          onChange={
            source.kind === 'website'
              ? undefined
              : (event) => url.setDraft(event.target.value)
          }
          onBlur={source.kind === 'website' ? undefined : url.commit}
          onKeyDown={source.kind === 'website' ? undefined : blurOnEnter}
          readOnly={source.kind === 'website'}
          aria-invalid={source.kind !== 'website' && url.error !== null}
          className="h-9 text-base text-fg md:text-sm"
        />
        <FieldError message={url.error} />
      </label>

      {isNoteOpen || note.draft !== '' ? (
        <label className="flex flex-col gap-1.5 text-xs text-muted-fg">
          Note
          <textarea
            autoFocus={isNoteOpen}
            rows={4}
            value={note.draft}
            onChange={(event) => note.setDraft(event.target.value)}
            onBlur={note.commit}
            aria-invalid={note.error !== null}
            className="resize-none rounded-md border border-border bg-transparent px-2.5 py-2 text-base text-fg outline-none focus-visible:border-ring aria-invalid:border-danger md:text-sm"
          />
          <FieldError message={note.error} />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setIsNoteOpen(true)}
          className="self-start text-sm text-muted-fg hover:text-fg"
        >
          + Add a note
        </button>
      )}
    </div>
  );
}
