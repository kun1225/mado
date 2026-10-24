import { Switch } from '@repo/ui/switch';

import { useShowFolderSources } from '#/features/collections/collection-preference-hooks';
import type {
  SettingsSwitchRowProps,
  SettingsThemeOption,
} from '#/features/settings/settings.type';
import { useSettingsTheme } from '#/features/settings/settings-theme-hooks';

const THEME_TITLE_ID = 'settings-theme-title';
const THEME_INPUT_NAME = 'settings-theme';
const COLLECTIONS_TITLE_ID = 'settings-collections-title';

const THEME_OPTIONS: readonly SettingsThemeOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System', hint: 'Match your device settings.' },
];

export function SettingsGeneralTab() {
  return (
    <div className="space-y-8">
      <SettingsThemeSection />
      <SettingsCollectionsSection />
    </div>
  );
}

// *** SettingsThemeSection ***
// Native radios, so arrow keys and screen readers work with no extra code.
function SettingsThemeSection() {
  const { preference, setPreference } = useSettingsTheme();

  return (
    <fieldset aria-labelledby={THEME_TITLE_ID} className="space-y-4">
      <legend id={THEME_TITLE_ID} className="text-sm font-medium">
        Theme
      </legend>
      <div className="space-y-3">
        {THEME_OPTIONS.map((option) => {
          const id = `${THEME_INPUT_NAME}-${option.value}`;
          const hintId = `${id}-hint`;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id={id}
                type="radio"
                name={THEME_INPUT_NAME}
                value={option.value}
                checked={preference === option.value}
                onChange={() => setPreference(option.value)}
                aria-describedby={option.hint ? hintId : undefined}
                className="mt-0.5 size-4 cursor-pointer accent-fg"
              />
              <span className="space-y-0.5">
                <span className="block text-sm">{option.label}</span>
                {option.hint && (
                  <span id={hintId} className="block text-xs text-muted-fg">
                    {option.hint}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// *** SettingsCollectionsSection ***
function SettingsCollectionsSection() {
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
