import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Cancel01Icon,
  Link01Icon,
  Settings01Icon,
  TextIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, useReducedMotion } from 'motion/react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
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
import type { SearchResults } from '#/features/search/search.type';
import {
  createSearchIndex,
  searchLibrary,
} from '#/features/search/search-action';
import { useRecentSearches } from '#/features/search/search-hooks';
import { useSettingsSearch } from '#/features/settings/settings-panel-hooks';
import { useShortcuts } from '#/features/shortcuts/shortcuts-hooks';
import {
  useAllSources,
  useMediaObjectUrl,
} from '#/features/sources/hooks/source-hooks';
import { SOURCE_SEARCH_KEY } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';
import { isVideoMimeType } from '#/features/sources/source-types';

import {
  ActionDockSearchCollectionRow,
  ActionDockSearchPanel,
  ActionDockSearchSaveRow,
  DOCK_SPRING,
  DOCK_WIDTH,
  MotionCommand,
  REDUCED_DOCK_WIDTH,
} from './action-dock-search-panel';
import { FLOATING_BAR } from './action-dock-surface';

// A default like `data = []` makes React Compiler skip the whole component.
const NO_COLLECTIONS: Collection[] = [];
const NO_SOURCES: Source[] = [];

export function ActionDockSearch({ onReveal }: { onReveal: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const recent = useRecentSearches();
  const collections = useCollections().data ?? NO_COLLECTIONS;
  const sources = useAllSources().data ?? NO_SOURCES;

  const hasQuery = query.trim() !== '';
  const showPanel = isOpen && (hasQuery || recent.queries.length > 0);

  const index = createSearchIndex(collections, sources);
  const results = searchLibrary(index, query);

  function close() {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  useDismissOnPointerDownOutside(rootRef, isOpen, close);

  useShortcuts({
    'focus-search': () => {
      flushSync(onReveal);
      focusWhenVisible(inputRef.current);
    },
  });

  // Tabbing away must close the panel too, or its pointerdown listener stays alive.
  function handleBlur(event: React.FocusEvent) {
    if (!rootRef.current?.contains(event.relatedTarget)) close();
  }

  // Focus stays inside the root while open, so Escape always lands here.
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
    // Only the library grid has every source, so the detail dialog can always find it there.
    void navigate({
      to: '/library',
      search: { [SOURCE_SEARCH_KEY]: source.id },
    } as never);
  }

  return (
    <MotionCommand
      ref={rootRef}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      shouldFilter={false}
      loop
      label="Search collections and saves"
      initial={false}
      animate={{ width: isOpen ? DOCK_WIDTH.open : DOCK_WIDTH.closed }}
      transition={reduceMotion ? REDUCED_DOCK_WIDTH : DOCK_SPRING}
      className="pointer-events-auto relative max-w-full min-w-0"
    >
      <AnimatePresence>
        {showPanel && (
          <ActionDockSearchPanel key="panel" reduceMotion={reduceMotion}>
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
          </ActionDockSearchPanel>
        )}
      </AnimatePresence>

      <div className={cn(FLOATING_BAR, 'relative')}>
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
    </MotionCommand>
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

// *** focusWhenVisible ***
// A hidden element cannot take focus. The dock shows through a CSS transition, so it can still count as hidden in the frame it was revealed.
function focusWhenVisible(input: HTMLInputElement | null, triesLeft = 5) {
  if (!input) return;

  input.focus();
  if (document.activeElement === input || triesLeft === 0) return;

  requestAnimationFrame(() => focusWhenVisible(input, triesLeft - 1));
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
            <ActionDockSearchCollectionRow
              key={collection.id}
              value={`collection-${collection.id}`}
              name={collection.name}
              onSelect={() => onCollection(collection)}
            />
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
    <ActionDockSearchSaveRow
      value={`source-${source.id}`}
      name={source.name}
      onSelect={onSelect}
      thumb={
        !objectUrl ? (
          <HugeiconsIcon
            icon={source.kind === 'text' ? TextIcon : Link01Icon}
            size={14}
            strokeWidth={1.5}
          />
        ) : isVideoMimeType(source.mimeType) ? (
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
        )
      }
    />
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
      {/* cmdk hides group headings from screen readers, so Clear lives outside the group. */}
      <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 t-b-4 text-muted-fg">
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
              // Arrow keys cannot reach a button inside an option, and it confuses screen readers.
              // So it is mouse-only. Keyboard users have Clear.
              tabIndex={-1}
              aria-hidden
              onClick={(event) => {
                // Stop the row's onSelect, or removing would also fill the input.
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
function ActionDockSearchSettingsButton() {
  const settings = useSettingsSearch();
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
              onClick={() => settings.open('general')}
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
