import { useState } from 'react';
import {
  Delete02Icon,
  Download01Icon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

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
import { cn } from '@repo/ui/cn';
import {
  MorphDropdownMenu,
  MorphDropdownMenuContent,
  MorphDropdownMenuItem,
  MorphDropdownMenuTrigger,
} from '@repo/ui/morph-dropdown-menu';
import { toast } from '@repo/ui/sonner';

import {
  DEFAULT_FONT_SAMPLE,
  fontSampleSchema,
  toCoverFace,
  toFontFaceStyle,
  toFontStyleName,
} from '#/features/sources/font-source';
import type {
  FontSourceContent,
  FontSourceFace,
} from '#/features/sources/font-source.type';
import { useFontFaces } from '#/features/sources/hooks/font-hooks';
import {
  useRemoveFontFace,
  useUpdateFontCover,
  useUpdateFontSample,
} from '#/features/sources/hooks/source-hooks';
import { downloadFontFace } from '#/features/sources/source-media';
import type { Source } from '#/features/sources/source-types';

import type { SourceDetailFontSample } from './source-detail-font.type';

/** The cover sentence and the cover style, shown in the sidebar under Details. */
export function SourceDetailFontPanel({
  source,
  font,
  sample,
  onAddStyles,
  isAddingStyles,
}: {
  source: Source;
  font: FontSourceContent;
  sample: SourceDetailFontSample;
  onAddStyles: () => void;
  isAddingStyles: boolean;
}) {
  return (
    <>
      <label className="flex flex-col gap-1.5 t-b-4 text-muted-fg">
        Cover sentence
        <textarea
          rows={3}
          value={sample.draft}
          placeholder={DEFAULT_FONT_SAMPLE}
          onChange={(event) => sample.setDraft(event.target.value)}
          onBlur={sample.commit}
          onKeyDown={(event) => {
            // Undo the edit only. With nothing to undo, Escape closes the dialog as usual.
            // No blur here: the blur handler still holds the old draft and would save it.
            if (event.key === 'Escape' && sample.isDirty) {
              event.preventDefault();
              event.stopPropagation();
              sample.revert();
            }
          }}
          aria-invalid={sample.error !== null}
          className="resize-none rounded-md border border-border bg-transparent px-2.5 py-2 t-b-2 text-fg outline-none focus-visible:border-ring aria-invalid:border-danger md:t-b-3"
        />
        {sample.error && (
          <p role="alert" className="t-b-4 text-danger">
            {sample.error}
          </p>
        )}
      </label>

      <SourceDetailFontStyles
        source={source}
        font={font}
        onAddStyles={onAddStyles}
        isAddingStyles={isAddingStyles}
      />
    </>
  );
}

/**
 * Lives in the dialog, so the poster can follow each key while the sidebar
 * holds the box. Like `useSourceField`, a new saved value resets the draft.
 */
export function useFontSampleDraft(
  source: Source | undefined,
): SourceDetailFontSample {
  const saved = source?.font?.sample ?? '';
  const fresh = {
    sourceId: source?.id,
    saved,
    submitted: null,
    draft: saved,
    error: null,
  };
  const [edit, setEdit] = useState<{
    sourceId: string | undefined;
    saved: string;
    /** What the last commit sent, so its save landing keeps newer typing. */
    submitted: string | null;
    draft: string;
    error: string | null;
  }>(fresh);
  const { mutate: updateSample } = useUpdateFontSample();
  const current =
    edit.sourceId === source?.id &&
    (edit.saved === saved || edit.submitted === saved)
      ? edit
      : fresh;

  function commit() {
    if (!source || current.draft.trim() === saved) {
      setEdit({ ...current, draft: saved, error: null });
      return;
    }
    const result = fontSampleSchema.safeParse(current.draft);
    if (!result.success) {
      setEdit({ ...current, error: result.error.issues[0]?.message ?? null });
      return;
    }
    const submitted = result.data ?? '';
    setEdit({ ...current, submitted, draft: submitted, error: null });
    updateSample({ id: source.id, text: current.draft });
  }

  return {
    draft: current.draft,
    error: current.error,
    isDirty: current.draft !== saved,
    sentence: current.draft.trim() || DEFAULT_FONT_SAMPLE,
    setDraft: (draft: string) => setEdit({ ...current, draft }),
    commit,
    revert: () => setEdit(fresh),
  };
}

// *** SourceDetailFontStyles ***
// Each row is drawn in its own style, so picking a cover is picking what you see.
function SourceDetailFontStyles({
  source,
  font,
  onAddStyles,
  isAddingStyles,
}: {
  source: Source;
  font: FontSourceContent;
  onAddStyles: () => void;
  isAddingStyles: boolean;
}) {
  const { family } = useFontFaces(source.id, font.faces, true);
  const { mutate: updateCover } = useUpdateFontCover();
  const { mutate: removeFace } = useRemoveFontFace();
  const [removing, setRemoving] = useState<FontSourceFace | null>(null);
  const cover = toCoverFace(font);

  return (
    <section className="flex flex-col gap-1.5">
      <h3 id={`${source.id}-cover-style`} className="t-b-4 text-muted-fg">
        Cover style
      </h3>
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
        <div
          role="radiogroup"
          aria-labelledby={`${source.id}-cover-style`}
          className="flex flex-col divide-y divide-border"
        >
          {font.faces.map((face) => (
            <SourceDetailFontStyleRow
              key={face.storageKey}
              face={face}
              family={family}
              isCover={face.storageKey === cover.storageKey}
              canRemove={font.faces.length > 1}
              onPick={() =>
                updateCover({ id: source.id, storageKey: face.storageKey })
              }
              onRemove={() => setRemoving(face)}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={isAddingStyles}
          onClick={onAddStyles}
          className="px-3 py-2 text-center t-b-4 text-muted-fg hover:bg-muted hover:text-fg disabled:animate-pulse motion-reduce:disabled:animate-none"
        >
          + Add styles
        </button>
      </div>

      <SourceDetailFontRemoveDialog
        face={removing}
        family={font.family}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            removeFace({ id: source.id, storageKey: removing.storageKey });
          }
          setRemoving(null);
        }}
      />
    </section>
  );
}

// *** SourceDetailFontStyleRow ***
function SourceDetailFontStyleRow({
  face,
  family,
  isCover,
  canRemove,
  onPick,
  onRemove,
}: {
  face: FontSourceFace;
  family: string | null;
  isCover: boolean;
  canRemove: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  const name = toFontStyleName(face);

  function download() {
    downloadFontFace(face).catch((error: unknown) => {
      console.error(`Failed to download "${face.fileName}"`, error);
      toast.error('Could not download this style.');
    });
  }

  return (
    <div className={cn('flex items-center', isCover && 'bg-muted')}>
      <button
        type="button"
        role="radio"
        aria-checked={isCover}
        aria-label={`${name}, ${face.fileName}`}
        onClick={onPick}
        className="flex min-w-0 flex-1 items-baseline justify-between gap-2 py-2 pr-1 pl-3 text-left hover:bg-muted"
      >
        <span
          style={family ? toFontFaceStyle(family, face) : undefined}
          className="min-w-0 truncate text-lg text-fg"
        >
          {name}
        </span>
        <span className="shrink-0 t-b-4 text-muted-fg tabular-nums">
          {isCover
            ? 'Cover'
            : Array.isArray(face.weight)
              ? face.weight.join('–')
              : face.weight}
        </span>
      </button>

      <MorphDropdownMenu>
        <MorphDropdownMenuTrigger
          aria-label={`${name} options`}
          className="mr-1 size-7 shrink-0 border-transparent bg-transparent p-0 text-muted-fg hover:text-fg data-popup-open:text-fg"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} strokeWidth={2} />
        </MorphDropdownMenuTrigger>
        <MorphDropdownMenuContent align="end" className="min-w-44">
          <MorphDropdownMenuItem onClick={download}>
            <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={1.5} />
            Download
          </MorphDropdownMenuItem>
          <MorphDropdownMenuItem
            variant="danger"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} />
            {canRemove ? 'Remove style' : 'The last style stays'}
          </MorphDropdownMenuItem>
        </MorphDropdownMenuContent>
      </MorphDropdownMenu>
    </div>
  );
}

// *** SourceDetailFontRemoveDialog ***
// The file is deleted for good, with no trash, so ask first.
function SourceDetailFontRemoveDialog({
  face,
  family,
  onCancel,
  onConfirm,
}: {
  face: FontSourceFace | null;
  family: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={face !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {family} {face ? toFontStyleName(face) : ''}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {face?.fileName} is deleted from this device. You can add it again
            later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-danger text-danger-fg hover:bg-danger/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
