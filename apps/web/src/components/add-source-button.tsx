import { useEffect, useRef, useState } from 'react';
import {
  Add01Icon,
  Image01FreeIcons,
  Link01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';
import { Liquid } from 'liquid-gooey';
import { ZodError } from 'zod';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/tooltip';

import { useCreateSources } from '#/features/sources/hooks/source-hooks';
import { usePasteMedia } from '#/features/sources/hooks/source-interaction-hooks';
import { ACCEPTED_FILE_TYPES } from '#/features/sources/source-media';

const TOGGLE_SIZE = 56;
const ACTION_SIZE = 48;
const ACTION_GAP = 16;
// Centers each action over the toggle, whatever the sizes.
const ACTION_INSET = (TOGGLE_SIZE - ACTION_SIZE) / 2;

const STAGGER_MS = 50;
const ICON_FADE_DELAY_MS = 100;
const ICON_FADE_MS = 200;

const CIRCLE_BUTTON =
  'group hit-area-1 pointer-events-auto flex items-center justify-center rounded-full text-accent-fg outline-none duration-fast ease-out-quart focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96] disabled:pointer-events-none motion-reduce:transition-none';

const ICON_HOVER =
  'transition-transform ease-out-quart group-hover:scale-110 motion-reduce:transition-none';

const ACTIONS = [
  { key: 'image', label: 'Add image', icon: Image01FreeIcons },
  { key: 'website', label: 'Add website', icon: Link01Icon },
] as const;

type ActionKey = (typeof ACTIONS)[number]['key'];

function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'That file is not supported.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while adding the file.';
}

export function AddSourceButton({
  collectionId,
}: {
  collectionId: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const createSourcesMutation = useCreateSources();
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const { mutate: createSources } = createSourcesMutation;
  const handlePaste = (file: File) => createSources([{ collectionId, file }]);
  usePasteMedia(handlePaste);

  useEffect(() => {
    setReducedMotion(matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

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

    // Reset so picking the same file again still fires a change event.
    fileInput.value = '';

    if (inputs.length > 0) createSourcesMutation.mutate(inputs);
  }

  function handleAction(key: ActionKey) {
    setOpen(false);
    // TODO: The website action will open a paste-a-URL dialog; not built yet.
    if (key === 'image') fileInputRef.current?.click();
  }

  const transition = reducedMotion ? { duration: 0 } : ('bouncy' as const);

  return (
    <TooltipProvider delay={200}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFilesSelected}
        className="hidden"
      />

      <div ref={rootRef} className="fixed bottom-6 left-edge z-action-bar">
        {createSourcesMutation.isError && (
          <p
            role="alert"
            className="absolute bottom-3 left-16 w-max max-w-64 rounded-md bg-fg px-3 py-1.5 text-xs text-bg"
          >
            {toErrorMessage(createSourcesMutation.error)}
          </p>
        )}

        <Liquid
          blur={8}
          contrast={20}
          fill="var(--poise-color-accent)"
          shadow="0 1px 3px rgba(0,0,0,.14), 0 8px 20px -6px rgba(0,0,0,.34)"
          className="pointer-events-none"
          style={{
            width: TOGGLE_SIZE,
            height: TOGGLE_SIZE + (ACTION_SIZE + ACTION_GAP) * ACTIONS.length,
          }}
        >
          {ACTIONS.map((action, index) => {
            const rise =
              TOGGLE_SIZE + ACTION_GAP + index * (ACTION_SIZE + ACTION_GAP);

            return (
              <Liquid.Item
                key={action.key}
                x={ACTION_INSET}
                y={open ? -rise : 0}
                scale={open ? 1 : 0.1}
                radius={ACTION_SIZE / 2}
                transition={transition}
                delay={reducedMotion || !open ? 0 : index * STAGGER_MS}
                className="absolute bottom-0 left-0"
              >
                <div inert={!open}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label={action.label}
                          onClick={() => handleAction(action.key)}
                          className={cn(
                            CIRCLE_BUTTON,
                            'size-12 transition-[scale,opacity]',
                            open ? 'opacity-100' : 'opacity-0',
                          )}
                          style={{
                            transitionDelay:
                              open && !reducedMotion
                                ? `0ms, ${ICON_FADE_DELAY_MS + index * STAGGER_MS}ms`
                                : '0ms',
                            transitionDuration: open
                              ? `120ms, ${ICON_FADE_MS}ms`
                              : '120ms',
                          }}
                        />
                      }
                    >
                      <HugeiconsIcon
                        icon={action.icon}
                        size={20}
                        strokeWidth={1.8}
                        className={cn(ICON_HOVER, 'duration-fast')}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {action.label}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </Liquid.Item>
            );
          })}

          <Liquid.Item className="absolute bottom-0 left-0">
            <button
              ref={toggleRef}
              type="button"
              aria-label={open ? 'Close menu' : 'Add new source'}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              disabled={createSourcesMutation.isPending}
              className={cn(CIRCLE_BUTTON, 'size-14 transition-[scale]')}
            >
              {createSourcesMutation.isPending ? (
                <span
                  aria-hidden
                  className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                />
              ) : (
                <HugeiconsIcon
                  icon={Add01Icon}
                  size={32}
                  strokeWidth={1.5}
                  className={cn(
                    ICON_HOVER,
                    'duration-base',
                    open && 'rotate-45',
                  )}
                />
              )}
            </button>
          </Liquid.Item>
        </Liquid>
      </div>
    </TooltipProvider>
  );
}
