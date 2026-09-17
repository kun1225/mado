import { useRef } from 'react';
import { ZodError } from 'zod';

import { Button } from '@repo/ui/button';

import { useCreateSources } from '../../../features/sources/source-hooks';

const ACCEPTED_FILE_TYPES = 'image/*,video/*';

function toErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'That file is not supported.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while adding the file.';
}

/** A null collectionId adds the source at the library level. */
export function AddSourceButton({
  collectionId,
}: {
  collectionId: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createSourcesMutation = useCreateSources();

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

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFilesSelected}
        className="hidden"
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={createSourcesMutation.isPending}
      >
        {createSourcesMutation.isPending ? 'Adding...' : 'Add new source'}
      </Button>

      {createSourcesMutation.isError && (
        <p className="text-destructive text-sm">
          {toErrorMessage(createSourcesMutation.error)}
        </p>
      )}
    </div>
  );
}
