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
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'motion/react';

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
import { springs } from '@repo/ui/motion';
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
import { useSettingsSearch } from '#/features/settings/settings-hooks';
import {
  useAllSources,
  useMediaObjectUrl,
} from '#/features/sources/hooks/source-hooks';
import { SOURCE_SEARCH_KEY } from '#/features/sources/hooks/source-interaction-hooks';
import type { Source } from '#/features/sources/source-types';

import { FLOATING_BAR, FLOATING_SURFACE } from '.';

// A default like `data = []` makes React Compiler skip the whole component.
const NO_COLLECTIONS: Collection[] = [];
const NO_SOURCES: Source[] = [];

const MotionCommand = motion.create(Command);

const DOCK_WIDTH = { closed: '22rem', open: '30rem' };

const DOCK_SPRING = springs.bouncy;

const PANEL_VARIANTS = {
  hidden: { y: 48, transition: DOCK_SPRING },
  shown: { y: 0, transition: DOCK_SPRING },
};
const PANEL_BOX_VARIANTS = {
  hidden: { left: '25%', right: '25%', height: 32, transition: DOCK_SPRING },
  shown: { left: '0%', right: '0%', height: '100%', transition: DOCK_SPRING },
};
const PANEL_ROWS_VARIANTS = {
  hidden: {
    clipPath: 'inset(calc(100% - 32px) 25% 0% 25% round 16px)',
    transition: DOCK_SPRING,
  },
  shown: {
    clipPath: 'inset(calc(0% - 0px) 0% 0% 0% round 16px)',
    transition: DOCK_SPRING,
  },
};
const PANEL_FADE_VARIANTS = {
  hidden: { opacity: 0 },
  shown: { opacity: 1 },
};
const NO_MOTION = { duration: 0 };

export function ActionDockSearch() {
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
      transition={reduceMotion ? NO_MOTION : DOCK_SPRING}
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

// *** keepInputFocus ***
// Clicking a row would blur the input, and arrow keys and Enter need the input focused.
function keepInputFocus(event: React.MouseEvent) {
  event.preventDefault();
}

// *** ActionDockSearchPanel ***
function ActionDockSearchPanel({
  reduceMotion,
  children,
}: {
  reduceMotion: boolean | null;
  children: React.ReactNode;
}) {
  // An exiting panel must not take clicks, or a row could still navigate.
  const isPresent = useIsPresent();
  const list = (
    <ActionDockSearchAutoHeight reduceMotion={reduceMotion}>
      <CommandList
        onMouseDown={keepInputFocus}
        className="max-h-[min(24rem,60dvh)] p-1.5"
      >
        {children}
      </CommandList>
    </ActionDockSearchAutoHeight>
  );

  if (reduceMotion) {
    return (
      <motion.div
        inert={!isPresent}
        variants={PANEL_FADE_VARIANTS}
        initial="hidden"
        animate="shown"
        exit="hidden"
        className={cn(
          FLOATING_SURFACE,
          'absolute inset-x-0 bottom-full mb-2 rounded-2xl bg-bg/95',
        )}
      >
        {list}
      </motion.div>
    );
  }

  return (
    <motion.div
      inert={!isPresent}
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="shown"
      exit="hidden"
      className="absolute inset-x-0 bottom-full mb-2"
    >
      {/* Only the rows are clipped. On a clipped element's child, Chrome blurs a square box. */}
      <motion.div
        variants={PANEL_BOX_VARIANTS}
        className={cn(
          FLOATING_SURFACE,
          'absolute bottom-0 rounded-2xl bg-bg/95',
        )}
      />
      <motion.div variants={PANEL_ROWS_VARIANTS} className="relative">
        {list}
      </motion.div>
    </motion.div>
  );
}

// *** ActionDockSearchAutoHeight ***
// CSS cannot animate to `height: auto`, so the rows are measured and the wrapper springs to that number.
function ActionDockSearchAutoHeight({
  reduceMotion,
  children,
}: {
  reduceMotion: boolean | null;
  children: React.ReactNode;
}) {
  const [contentRef, height] = useElementHeight<HTMLDivElement>();

  return (
    // Rows sit at the bottom so the top edge, away from the bar, is the one that bounces.
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduceMotion ? NO_MOTION : DOCK_SPRING}
      className="flex flex-col justify-end overflow-hidden"
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

// *** useElementHeight ***
function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize[0]?.blockSize ?? 'auto');
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, height] as const;
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
      {/* cmdk hides group headings from screen readers, so Clear lives outside the group. */}
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
              onClick={() => settings.open('account')}
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
