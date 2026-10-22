import { Switch } from '@repo/ui/switch';

import { useShowFolderSources } from '#/features/collections/collection-preference-hooks';
import type { SettingsSwitchRowProps } from '#/features/settings/settings.type';

const COLLECTIONS_TITLE_ID = 'settings-collections-title';

export function SettingsGeneralTab() {
  const { showFolderSources, setShowFolderSources } = useShowFolderSources();

  return (
    <section aria-labelledby={COLLECTIONS_TITLE_ID} className="space-y-4">
      <h3 id={COLLECTIONS_TITLE_ID} className="text-sm font-medium">
        Collections
      </h3>
      <SettingsSwitchRow
        id="settings-show-folder-sources"
        label="Show sources from folders"
        hint="When off, a collection shows only the sources saved right in it."
        checked={showFolderSources}
        onCheckedChange={setShowFolderSources}
      />
    </section>
  );
}

// *** SettingsSwitchRow ***
// The whole row is a label, so a click on the text flips the switch too.
function SettingsSwitchRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: SettingsSwitchRowProps) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;

  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="space-y-0.5">
        <span id={labelId} className="block text-sm">
          {label}
        </span>
        <span id={hintId} className="block text-xs text-muted-fg">
          {hint}
        </span>
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="mt-0.5"
      />
    </label>
  );
}
