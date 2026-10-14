import { useEffect, useRef, useState } from 'react';
import {
  Cancel01Icon,
  Folder01Icon,
  Link01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from 'cn';

import { Button } from '@repo/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@repo/ui/command';
import { Separator } from '@repo/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

import { useCollections } from '#/features/collections/collection-hooks';
import type { Collection } from '#/features/collections/collection-types';
import { useRecentSearches } from '#/features/search/hooks/search-hooks';
import {
  createSearchIndex,
  searchLibrary,
} from '#/features/search/search-action';
import type { SearchResults } from '#/features/search/search-type';
import {
  useAllSources,
  useMediaObjectUrl,
} from '#/features/sources/hooks/source-hooks';
import { SOURCE_SEARCH_KEY } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';

import { FLOATING_BAR, FLOATING_SURFACE } from '.';

// A destructuring default (`data = []`) makes React Compiler skip the whole component.
const NO_COLLECTIONS: Collection[] = [];
const NO_SOURCES: Source[] = [];

export function ActionDockSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const recent = useRecentSearches();
  const collections = useCollections().data ?? NO_COLLECTIONS;
  const sources = useAllSources().data ?? NO_SOURCES;

  const index = createSearchIndex(collections, sources);
  const results = searchLibrary(index, query);
  const hasQuery = query.trim() !== '';
  const showPanel = isOpen && (hasQuery || recent.queries.length > 0);

  function close() {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  useDismissOnPointerDownOutside(rootRef, isOpen, close);

  // Tabbing away must close the panel too, or its pointerdown listener outlives it.
  function handleBlur(event: React.FocusEvent) {
    if (!rootRef.current?.contains(event.relatedTarget)) close();
  }

  // Focus never leaves the root while open (see handleBlur), so Escape always lands here.
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') close();
  }

  function openCollection(collection: Collection) {
    recent.add(query);
    close();
    void navigate({
      to: '/collection/$collectionId',
      params: { collectionId: collection.id },
    });
  }

  function openSource(source: Source) {
    recent.add(query);
    close();
    // Only the library grid holds every source, so the detail dialog can
    // always find this one there.
    void navigate({
      to: '/library',
      search: { [SOURCE_SEARCH_KEY]: source.id },
    } as never);
  }

  return (
    <Command
      ref={rootRef}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      shouldFilter={false}
      loop
      label="Search collections and saves"
      data-open={isOpen}
      className="pointer-events-auto relative w-88 max-w-full min-w-0 transition-[width] duration-slow ease-out-quart data-[open=true]:w-120 motion-reduce:transition-none"
    >
      {showPanel && (
        <CommandList
          onMouseDown={keepInputFocus}
          className={cn(
            FLOATING_SURFACE,
            'absolute inset-x-0 bottom-full mb-2 max-h-[min(24rem,60dvh)] origin-bottom animate-in rounded-2xl p-1.5 duration-base ease-out-quart fade-in-0 zoom-in-95 slide-in-from-bottom-2 motion-reduce:animate-none',
          )}
        >
          {hasQuery ? (
            <ActionDockSearchResults
              query={query}
              results={results}
              onCollection={openCollection}
              onSource={openSource}
            />
          ) : (
            <ActionDockSearchRecent
              queries={recent.queries}
              onPick={setQuery}
              onRemove={recent.remove}
              onClear={recent.clear}
            />
          )}
        </CommandList>
      )}

      <div className={FLOATING_BAR}>
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          onFocus={() => setIsOpen(true)}
          placeholder="Search"
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ActionDockSearchSettingsButton />
      </div>
    </Command>
  );
}

// *** useDismissOnPointerDownOutside ***
function useDismissOnPointerDownOutside(
  ref: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isActive) return;

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [ref, isActive, onDismiss]);
}

// *** keepInputFocus ***
// Clicking a row would blur the input, and arrow keys and Enter only work while it has focus.
function keepInputFocus(event: React.MouseEvent) {
  event.preventDefault();
}

// *** ActionDockSearchResults ***
function ActionDockSearchResults({
  query,
  results,
  onCollection,
  onSource,
}: {
  query: string;
  results: SearchResults;
  onCollection: (collection: Collection) => void;
  onSource: (source: Source) => void;
}) {
  const hasCollections = results.collections.length > 0;
  const hasSources = results.sources.length > 0;

  return (
    <>
      <CommandEmpty>No matches for “{query.trim()}”</CommandEmpty>

      {hasCollections && (
        <CommandGroup heading="Collections">
          {results.collections.map((collection) => (
            <CommandItem
              key={collection.id}
              value={`collection-${collection.id}`}
              onSelect={() => onCollection(collection)}
            >
              <HugeiconsIcon
                icon={Folder01Icon}
                strokeWidth={1.5}
                className="text-muted-fg"
              />
              <span className="min-w-0 flex-1 truncate">{collection.name}</span>
              <span className="text-xs text-muted-fg">
                {collection.parentId ? 'Folder' : 'Collection'}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {/* cmdk hides separators during a search unless told otherwise. */}
      {hasCollections && hasSources && <CommandSeparator alwaysRender />}

      {hasSources && (
        <CommandGroup heading="Saves">
          {results.sources.map((source) => (
            <ActionDockSearchSourceItem
              key={source.id}
              source={source}
              onSelect={() => onSource(source)}
            />
          ))}
        </CommandGroup>
      )}
    </>
  );
}

// *** ActionDockSearchSourceItem ***
function ActionDockSearchSourceItem({
  source,
  onSelect,
}: {
  source: Source;
  onSelect: () => void;
}) {
  const objectUrl = useMediaObjectUrl(
    source.storageKey,
    source.mimeType,
    source.sizeBytes,
  );

  return (
    <CommandItem value={`source-${source.id}`} onSelect={onSelect}>
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-fg">
        {!objectUrl ? (
          <HugeiconsIcon icon={Link01Icon} size={14} strokeWidth={1.5} />
        ) : source.kind === 'video' ? (
          <video
            src={objectUrl}
            muted
            playsInline
            preload="metadata"
            className="size-full object-cover"
          />
        ) : (
          <img
            src={objectUrl}
            alt=""
            decoding="async"
            className="size-full object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{source.name}</span>
      <span className="text-xs text-muted-fg">Save</span>
    </CommandItem>
  );
}

// *** ActionDockSearchRecent ***
function ActionDockSearchRecent({
  queries,
  onPick,
  onRemove,
  onClear,
}: {
  queries: string[];
  onPick: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      {/* cmdk hides group headings from screen readers, so the Clear button lives outside the group. */}
      <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-xs text-muted-fg">
        <span>Recent</span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-sm outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Clear
        </button>
      </div>

      <CommandGroup aria-label="Recent searches">
        {queries.map((query) => (
          <CommandItem
            key={query}
            value={`recent-${query}`}
            onSelect={() => onPick(query)}
          >
            <span className="min-w-0 flex-1 truncate">{query}</span>
            <button
              type="button"
              // A button inside an option is unreachable by arrow keys and confuses
              // screen readers, so it is mouse-only; Clear covers keyboard users.
              tabIndex={-1}
              aria-hidden
              onClick={(event) => {
                // Removing must not also fill the input via the row's onSelect.
                event.stopPropagation();
                onRemove(query);
              }}
              className="-my-1 flex size-6 items-center justify-center rounded-full text-muted-fg outline-none hover:bg-border/60 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
            </button>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}

// *** ActionDockSearchSettingsButton ***
// Settings do not exist yet; the button holds the spot until they do.
function ActionDockSearchSettingsButton() {
  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          aria-label="Settings"
          render={
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-fg hover:text-fg"
            />
          }
        >
          <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.5} />
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
