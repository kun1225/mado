import { useRef } from 'react';
import { FolderExportIcon, FolderImportIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@repo/ui/accordion';
import { Button } from '@repo/ui/button';

import type { SettingsBackupSectionProps } from '#/features/settings/settings.type';

import { SettingsProgress } from './settings-progress';

const BACKUP_TITLE_ID = 'settings-backup-title';

// React's input types don't list it yet, but every desktop browser supports it.
const FOLDER_PICKER_ATTRIBUTES = { webkitdirectory: '' };

export function SettingsBackupSection({
  summary,
  canExport,
  exporting,
  importing,
  exportProgress,
  importProgress,
  onExport,
  onImport,
}: SettingsBackupSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = exporting || importing;

  return (
    <section aria-labelledby={BACKUP_TITLE_ID} className="space-y-4">
      <div className="space-y-1">
        <h3 id={BACKUP_TITLE_ID} className="t-l-2">
          Backup
        </h3>
        <p className="min-h-5 t-b-3 text-muted-fg tabular-nums">{summary}</p>
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
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={!canExport || busy}
          onClick={onExport}
        >
          <HugeiconsIcon icon={FolderExportIcon} size={16} strokeWidth={1.5} />
          {exporting ? 'Exporting…' : 'Export .zip'}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <HugeiconsIcon icon={FolderImportIcon} size={16} strokeWidth={1.5} />
          {importing ? 'Importing…' : 'Import folder'}
        </Button>
      </div>
      {exportProgress && (
        <SettingsProgress
          name="Export progress"
          label={`Packing file ${exportProgress.done} of ${exportProgress.total}…`}
          progress={exportProgress}
        />
      )}
      {importProgress && (
        <SettingsProgress
          name="Import progress"
          label={`Importing file ${importProgress.done} of ${importProgress.total}…`}
          progress={importProgress}
        />
      )}
      <Accordion className="text-muted-fg">
        <AccordionItem value="how-it-works">
          <AccordionTrigger>How it works</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1 pl-9">
              <li>
                Export downloads every source as a .zip. Collections become
                folders. The trash is not included.
              </li>
              <li>
                Import turns images and videos into sources and folders into
                collections. A folder from Export comes back just as it was.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
