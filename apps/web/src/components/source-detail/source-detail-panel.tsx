import { useId, useRef, useState } from 'react';
import {
  Cancel01Icon,
  Folder01Icon,
  ImageUpload01Icon,
  PencilEdit02Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import {
  MorphDropdownMenu,
  MorphDropdownMenuContent,
  MorphDropdownMenuItem,
  MorphDropdownMenuSub,
  MorphDropdownMenuSubContent,
  MorphDropdownMenuSubTrigger,
  MorphDropdownMenuTrigger,
} from '@repo/ui/morph-dropdown-menu';

import { useCollections } from '#/features/collections/collection-hooks';
import type { Collection } from '#/features/collections/collection-types';
import {
  useAllTags,
  useUpdateSource,
} from '#/features/sources/hooks/source-hooks';
import {
  useReplaceSourceDropzone,
  useSourceField,
} from '#/features/sources/hooks/source-interaction-hooks';
import type {
  Source,
  UpdateSourceInput,
} from '#/features/sources/source-types';
import {
  canEmbedSite,
  MAX_TAG_LENGTH,
  normalizeTag,
} from '#/features/sources/source-types';

export function SourceDetailPanel({
  source,
  thumbnailUrl,
  isOpen,
}: {
  source: Source;
  thumbnailUrl: string | null;
  isOpen: boolean;
}) {
  return (
    <div
      className={cn(
        'motion-reduce:transition-none md:shrink-0 md:overflow-hidden md:transition-[width] md:duration-300 md:ease-in-out-circ',
        isOpen ? 'md:w-88' : 'md:w-0',
      )}
      inert={!isOpen}
    >
      <aside
        className={cn(
          'pointer-events-auto z-10 flex flex-col gap-5 overflow-y-auto rounded-md bg-bg p-4 text-fg shadow-lg transition-[opacity,translate] duration-300 ease-in-out-circ motion-reduce:transition-none max-md:absolute max-md:top-0 max-md:right-4 max-md:bottom-4 max-md:w-72 max-md:max-w-[calc(100%-2rem)] md:ml-4 md:h-full md:w-80',
          !isOpen && 'translate-x-[calc(100%+1rem)]',
        )}
      >
        <header className="flex flex-col gap-0.5 border-b border-border pb-3">
          <h2 className="text-sm font-medium">Details</h2>
          <p className="text-xs text-muted-fg">{describe(source)}</p>
        </header>

        {canEmbedSite(source) && (
          <SourceDetailThumbnail source={source} objectUrl={thumbnailUrl} />
        )}
        <SourceDetailFields source={source} />
        <SourceDetailCollections source={source} />
        <SourceDetailTags source={source} />
      </aside>
    </div>
  );
}

// *** describe ***
function describe(source: Source): string {
  if (source.kind === 'website') return source.site?.domain ?? 'Website';
  const format = source.mimeType.split('/')[1]?.split('+')[0]?.toUpperCase();
  const size =
    source.width && source.height ? `${source.width}×${source.height}` : null;

  return [format, size, formatBytes(source.sizeBytes)]
    .filter(Boolean)
    .join(' · ');
}

// *** formatBytes ***
function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// *** SourceDetailThumbnail ***
// The live page hides the thumbnail, so this is the only place to see and swap it.
function SourceDetailThumbnail({
  source,
  objectUrl,
}: {
  source: Source;
  objectUrl: string | null;
}) {
  const replace = useReplaceSourceDropzone(source);
  const label = objectUrl ? 'Replace thumbnail' : 'Add thumbnail';

  return (
    <div className="flex flex-col gap-1.5 text-xs text-muted-fg">
      Thumbnail
      <div
        {...replace.getRootProps({
          className: cn(
            'relative aspect-video overflow-hidden rounded-md border border-border bg-muted transition-colors',
            !objectUrl && 'border-dashed',
            replace.isDragActive && 'border-accent bg-accent/10',
            replace.isBusy && 'animate-pulse motion-reduce:animate-none',
          ),
        })}
      >
        <input {...replace.getInputProps()} />
        <button
          type="button"
          aria-label={label}
          disabled={replace.isBusy}
          onClick={replace.open}
          className="group flex size-full items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {objectUrl && (
            <img
              src={objectUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <span
            className={cn(
              'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-opacity',
              objectUrl &&
                'bg-fg/70 text-bg opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              replace.isDragActive && 'opacity-100',
            )}
          >
            <HugeiconsIcon
              icon={ImageUpload01Icon}
              size={14}
              strokeWidth={1.5}
            />
            {replace.isDragActive ? 'Drop to replace' : label}
          </span>
        </button>
      </div>
    </div>
  );
}

// *** SourceDetailFields ***
function SourceDetailFields({ source }: { source: Source }) {
  const name = useSourceField(source, 'name');
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

      <SourceDetailUrlField source={source} onKeyDown={blurOnEnter} />

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

// *** SourceDetailUrlField ***
function SourceDetailUrlField({
  source,
  onKeyDown,
}: {
  source: Source;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const url = useSourceField(source, 'url');
  const [isEditing, setIsEditing] = useState(false);
  // Reads the draft, not `source.url`, so the link does not flash the old URL while the save is in flight.
  const href = url.draft.trim();
  const isLink = !isEditing && url.error === null && href !== '';

  return (
    <div className="flex flex-col gap-1.5 text-xs text-muted-fg">
      <label htmlFor={inputId}>URL</label>
      <div className="relative">
        {/* One input in both modes, so padding and border can animate between them. */}
        <Input
          ref={inputRef}
          id={inputId}
          type="url"
          inputMode="url"
          placeholder="https://..."
          readOnly={isLink}
          tabIndex={isLink ? -1 : undefined}
          value={url.draft}
          onChange={(event) => url.setDraft(event.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => {
            url.commit();
            setIsEditing(false);
          }}
          onKeyDown={onKeyDown}
          aria-invalid={url.error !== null}
          className={cn(
            'h-9 text-base text-ellipsis text-fg underline underline-offset-2 transition-[padding,border-color,text-decoration-color] duration-base ease-standard motion-reduce:transition-none md:text-sm',
            isLink ? 'border-transparent pr-10 pl-0' : 'decoration-transparent',
          )}
        />
        {isLink && (
          <>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${href}`}
              className="absolute inset-y-0 right-10 left-0"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit URL"
              onClick={() => inputRef.current?.focus()}
              className="absolute top-1/2 right-0 -translate-y-1/2"
            >
              <HugeiconsIcon
                icon={PencilEdit02Icon}
                size={16}
                strokeWidth={1.5}
              />
            </Button>
          </>
        )}
      </div>
      <FieldError message={url.error} />
    </div>
  );
}

// *** FieldError ***
function FieldError({ message }: { message: string | null }) {
  if (message === null) return null;

  return (
    <p role="alert" className="mt-1 text-xs text-danger">
      {message}
    </p>
  );
}

// *** SourceDetailCollections ***
function SourceDetailCollections({ source }: { source: Source }) {
  const collectionsQuery = useCollections();
  const updateSourceMutation = useUpdateSource();

  const collections = collectionsQuery.data ?? [];
  const joined = collections.filter(({ id }) =>
    source.collectionIds.includes(id),
  );
  const nodes = buildAvailableTree(collections, source.collectionIds);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function save(input: UpdateSourceInput) {
    updateSourceMutation.mutate({ id: source.id, input });
  }

  function add(id: string) {
    save({ addCollectionIds: [id] });
    setIsMenuOpen(false);
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs text-muted-fg">
        <HugeiconsIcon icon={Folder01Icon} size={14} strokeWidth={1.5} />
        Collections
      </h3>

      <div className="flex flex-wrap items-center gap-1.5">
        {joined.map((collection) => (
          <SourceDetailChip
            key={collection.id}
            label={collection.name}
            onRemove={() => save({ removeCollectionIds: [collection.id] })}
          />
        ))}

        <MorphDropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <MorphDropdownMenuTrigger className="h-auto rounded-full px-2.5 py-0.5 text-xs text-muted-fg hover:text-fg">
            + Add
          </MorphDropdownMenuTrigger>
          <MorphDropdownMenuContent align="start">
            {nodes.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-fg">
                {collections.length === 0
                  ? 'No collections yet.'
                  : 'In every collection already.'}
              </p>
            )}
            {nodes.map((node) => (
              <CollectionMenuNode
                key={node.collection.id}
                node={node}
                onAdd={add}
              />
            ))}
          </MorphDropdownMenuContent>
        </MorphDropdownMenu>
      </div>
    </section>
  );
}

// *** CollectionMenuNode ***

function CollectionMenuNode({
  node,
  onAdd,
}: {
  node: CollectionNode;
  onAdd: (id: string) => void;
}) {
  const { collection, isAvailable, children } = node;

  if (children.length === 0) {
    return (
      <MorphDropdownMenuItem onClick={() => onAdd(collection.id)}>
        {collection.name}
      </MorphDropdownMenuItem>
    );
  }

  return (
    <MorphDropdownMenuSub>
      <MorphDropdownMenuSubTrigger
        onClick={() => {
          if (isAvailable) onAdd(collection.id);
        }}
      >
        {collection.name}
      </MorphDropdownMenuSubTrigger>
      <MorphDropdownMenuSubContent>
        {children.map((child) => (
          <CollectionMenuNode
            key={child.collection.id}
            node={child}
            onAdd={onAdd}
          />
        ))}
      </MorphDropdownMenuSubContent>
    </MorphDropdownMenuSub>
  );
}

// *** buildAvailableTree ***

type CollectionNode = {
  collection: Collection;
  isAvailable: boolean;
  children: CollectionNode[];
};

/** Keeps a collection when it, or anything under it, can still be joined. */
function buildAvailableTree(
  collections: Collection[],
  joinedIds: string[],
  parentId: string | null = null,
): CollectionNode[] {
  return collections
    .filter((collection) => collection.parentId === parentId)
    .map((collection) => ({
      collection,
      isAvailable: !joinedIds.includes(collection.id),
      children: buildAvailableTree(collections, joinedIds, collection.id),
    }))
    .filter((node) => node.isAvailable || node.children.length > 0);
}

// *** SourceDetailTags ***
function SourceDetailTags({ source }: { source: Source }) {
  const suggestionsId = useId();
  const allTags = useAllTags();
  const updateSourceMutation = useUpdateSource();
  const [draft, setDraft] = useState('');

  function save(input: UpdateSourceInput) {
    updateSourceMutation.mutate({ id: source.id, input });
  }

  function addDraft() {
    const tag = normalizeTag(draft);

    setDraft('');
    if (tag === '' || source.tags.includes(tag)) return;
    save({ addTags: [tag] });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addDraft();
    } else if (
      event.key === 'Backspace' &&
      draft === '' &&
      source.tags.length > 0
    ) {
      save({ removeTags: source.tags.slice(-1) });
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs text-muted-fg">
        <HugeiconsIcon icon={Tag01Icon} size={14} strokeWidth={1.5} />
        Tags
      </h3>

      <div className="flex flex-wrap items-center gap-1.5">
        {source.tags.map((tag) => (
          <SourceDetailChip
            key={tag}
            label={tag}
            onRemove={() => save({ removeTags: [tag] })}
          />
        ))}

        <input
          list={suggestionsId}
          value={draft}
          maxLength={MAX_TAG_LENGTH}
          placeholder="+ Add"
          aria-label="Add a tag"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addDraft}
          className="w-20 min-w-0 flex-1 bg-transparent px-1 py-0.5 text-base outline-none placeholder:text-muted-fg md:text-xs"
        />

        <datalist id={suggestionsId}>
          {allTags
            .filter((tag) => !source.tags.includes(tag))
            .map((tag) => (
              <option key={tag} value={tag} />
            ))}
        </datalist>
      </div>
    </section>
  );
}

// *** SourceDetailChip ***
function SourceDetailChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-2.5 text-xs text-fg">
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="flex size-4 items-center justify-center rounded-full text-muted-fg hover:text-fg"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.5} />
      </button>
    </span>
  );
}
