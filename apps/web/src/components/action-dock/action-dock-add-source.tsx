import { useEffect, useRef, useState } from 'react';
import {
  Add01Icon,
  Image01FreeIcons,
  Link01Icon,
  NoteAddIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'motion/react';

import { Button } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';
import { Dialog, DialogContent, DialogTitle } from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { springs } from '@repo/ui/motion';

import { useCollections } from '#/features/collections/collection-hooks';
import {
  useCreateSources,
  useCreateWebsiteSource,
  useIsCreatingSources,
} from '#/features/sources/hooks/source-hooks';
import { usePasteSource } from '#/features/sources/hooks/source-interaction-hooks';
import { ACCEPTED_FILE_TYPES } from '#/features/sources/source-media';
import { toNoteFile } from '#/features/sources/text-source';

import { MarkdownNoteDialog } from './action-dock-markdown-dialog';
import { FLOATING_SURFACE } from '.';

const ACTIONS = [
  {
    key: 'image',
    label: 'Add file',
    hint: 'Images, videos, text',
    icon: Image01FreeIcons,
  },
  {
    key: 'website',
    label: 'Add website',
    hint: 'From a link',
    icon: Link01Icon,
  },
  {
    key: 'markdown',
    label: 'Add markdown',
    hint: 'Write a note',
    icon: NoteAddIcon,
  },
] as const;

type ActionKey = (typeof ACTIONS)[number]['key'];

const PANEL_ID = 'action-dock-add-panel';

// Same spring as the search panel, so both dock panels move alike.
const PANEL_SPRING = springs.bouncy;

// The panel grows out of the plus button, so it starts at the left edge.
const PANEL_VARIANTS = {
  hidden: { y: 48, transition: PANEL_SPRING },
  shown: { y: 0, transition: PANEL_SPRING },
};
const PANEL_BOX_VARIANTS = {
  hidden: { left: '0%', right: '75%', height: 32, transition: PANEL_SPRING },
  shown: { left: '0%', right: '0%', height: '100%', transition: PANEL_SPRING },
};
const PANEL_ROWS_VARIANTS = {
  hidden: {
    clipPath: 'inset(calc(100% - 32px) 75% 0% 0% round 16px)',
    transition: PANEL_SPRING,
  },
  shown: {
    clipPath: 'inset(calc(0% - 0px) 0% 0% 0% round 16px)',
    transition: PANEL_SPRING,
  },
};
const PANEL_FADE_VARIANTS = {
  hidden: { opacity: 0 },
  shown: { opacity: 1 },
};

export function ActionDockAddSource({
  collectionId,
}: {
  collectionId: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { mutate: createSources, isPending: isSavingNote } = useCreateSources();
  const { mutate: createWebsiteEmbedSource, isPending } =
    useCreateWebsiteSource();
  const isCreating = useIsCreatingSources();
  const reduceMotion = useReducedMotion();
  const collections = useCollections().data;
  const [open, setOpen] = useState(false);
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [markdownDialogOpen, setMarkdownDialogOpen] = useState(false);

  const placeName =
    collections?.find((collection) => collection.id === collectionId)?.name ??
    'Library';

  const handlePasteMedia = (file: File) =>
    createSources([{ collectionId, file }]);
  const handlePasteWebsite = (url: string) =>
    createWebsiteEmbedSource({ collectionId, url });
  usePasteSource(handlePasteMedia, handlePasteWebsite);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const fileInput = event.currentTarget;
    const inputs = Array.from(fileInput.files ?? []).map((file) => ({
      collectionId,
      file,
    }));

    // Without this, picking the same file again fires no change event.
    fileInput.value = '';

    if (inputs.length > 0) createSources(inputs);
  }

  function handleAction(key: ActionKey) {
    setOpen(false);
    if (key === 'image') fileInputRef.current?.click();
    else if (key === 'website') setWebsiteDialogOpen(true);
    else setMarkdownDialogOpen(true);
  }

  function handleWebsiteSubmit(url: string) {
    createWebsiteEmbedSource(
      { collectionId, url },
      { onSuccess: () => setWebsiteDialogOpen(false) },
    );
  }

  function handleMarkdownSubmit(title: string, body: string) {
    createSources([{ collectionId, file: toNoteFile(title, body) }], {
      // On a failure the toast shows why, and the dialog keeps the text.
      onSuccess: ({ sources }) => {
        if (sources.length > 0) setMarkdownDialogOpen(false);
      },
    });
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Not `relative`: the panel spans the whole dock row, so it sizes to the row in `ActionDock`. */}
      <div ref={rootRef} className="shrink-0">
        <button
          ref={toggleRef}
          type="button"
          aria-label={open ? 'Close menu' : 'Add new source'}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen((value) => !value)}
          disabled={isCreating}
          className={cn(
            FLOATING_SURFACE,
            'group hit-area-1 pointer-events-auto flex size-12 items-center justify-center rounded-full text-fg outline-none',
            'transition-[scale,background-color,border-color,color] duration-fast ease-out-quart focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] disabled:pointer-events-none motion-reduce:transition-none',
            'hover:bg-muted aria-expanded:border-accent aria-expanded:bg-accent aria-expanded:text-accent-fg',
          )}
        >
          {isCreating ? (
            <span
              aria-hidden
              className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          ) : (
            <HugeiconsIcon
              icon={Add01Icon}
              size={22}
              strokeWidth={1.5}
              className={cn(
                'transition-transform duration-base ease-out-quart motion-reduce:transition-none',
                open && 'rotate-45',
              )}
            />
          )}
        </button>

        {/* After the button, so Tab moves from the button into the rows. */}
        <AnimatePresence>
          {open && (
            <ActionDockAddSourcePanel key="panel" reduceMotion={reduceMotion}>
              <ActionDockAddSourceRows
                placeName={placeName}
                onAction={handleAction}
              />
            </ActionDockAddSourcePanel>
          )}
        </AnimatePresence>
      </div>

      {websiteDialogOpen && (
        <WebsiteUrlDialog
          open={websiteDialogOpen}
          onOpenChange={setWebsiteDialogOpen}
          onSubmit={handleWebsiteSubmit}
          isSaving={isPending}
        />
      )}
      {markdownDialogOpen && (
        <MarkdownNoteDialog
          open={markdownDialogOpen}
          onOpenChange={setMarkdownDialogOpen}
          onSubmit={handleMarkdownSubmit}
          isSaving={isSavingNote}
        />
      )}
    </>
  );
}

// *** ActionDockAddSourcePanel ***
function ActionDockAddSourcePanel({
  reduceMotion,
  children,
}: {
  reduceMotion: boolean | null;
  children: React.ReactNode;
}) {
  // An exiting panel must not take clicks, or a row could still fire.
  const isPresent = useIsPresent();

  if (reduceMotion) {
    return (
      <motion.div
        id={PANEL_ID}
        inert={!isPresent}
        variants={PANEL_FADE_VARIANTS}
        initial="hidden"
        animate="shown"
        exit="hidden"
        className={cn(
          FLOATING_SURFACE,
          'pointer-events-auto absolute inset-x-0 bottom-full mb-2 rounded-2xl bg-bg/95',
        )}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      id={PANEL_ID}
      inert={!isPresent}
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="shown"
      exit="hidden"
      className="pointer-events-auto absolute inset-x-0 bottom-full mb-2"
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
        {children}
      </motion.div>
    </motion.div>
  );
}

// *** ActionDockAddSourceRows ***
function ActionDockAddSourceRows({
  placeName,
  onAction,
}: {
  placeName: string;
  onAction: (key: ActionKey) => void;
}) {
  return (
    <div className="p-1.5">
      <p className="truncate px-2.5 pt-1.5 pb-1 t-b-4 text-muted-fg">
        Add to {placeName}
      </p>
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={() => onAction(action.key)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left t-b-3 outline-none hover:bg-muted focus-visible:bg-muted"
        >
          <HugeiconsIcon
            icon={action.icon}
            size={18}
            strokeWidth={1.5}
            className="text-muted-fg"
          />
          <span className="min-w-0 flex-1 truncate">{action.label}</span>
          <span className="shrink-0 t-b-4 text-muted-fg">{action.hint}</span>
        </button>
      ))}
    </div>
  );
}

// *** WebsiteUrlDialog ***
function WebsiteUrlDialog({
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
          <DialogTitle>Add website</DialogTitle>
          <p className="mt-1 t-b-3 text-muted-fg">
            Paste a website URL to save it as a source.
          </p>
          <label className="mt-5 flex flex-col gap-2 t-b-3">
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
