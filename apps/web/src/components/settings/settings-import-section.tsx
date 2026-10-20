import { useRef } from 'react';

import { Button } from '@repo/ui/button';

import type { SettingsImportSectionProps } from '#/features/settings/settings.type';

import { SettingsProgress } from './settings-progress';

const IMPORT_TITLE_ID = 'settings-import-title';

// React's input types don't list it yet, but every desktop browser supports it.
const FOLDER_PICKER_ATTRIBUTES = { webkitdirectory: '' };

export function SettingsImportSection({
  disabled,
  importing,
  progress,
  onImport,
}: SettingsImportSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby={IMPORT_TITLE_ID} className="space-y-4">
      <div className="space-y-1">
        <h3 id={IMPORT_TITLE_ID} className="text-sm font-medium">
          Import a folder
        </h3>
        <p className="text-sm text-muted-fg">
          Images and videos become sources, and folders become collections. A
          folder from Export comes back just as it was.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        {...FOLDER_PICKER_ATTRIBUTES}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Cleared, so picking the same folder again still fires a change.
          event.target.value = '';
          onImport(files);
        }}
      />
      <Button
        variant="outline"
        disabled={disabled || importing}
        onClick={() => inputRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import a folder'}
      </Button>
      {progress && (
        <SettingsProgress
          name="Import progress"
          label={`Importing file ${progress.done} of ${progress.total}…`}
          progress={progress}
        />
      )}
    </section>
  );
}
