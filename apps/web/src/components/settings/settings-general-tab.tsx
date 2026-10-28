import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  LiquidTabs,
  LiquidTabsList,
  LiquidTabsTrigger,
} from '@repo/ui/liquid-tab';
import { Switch } from '@repo/ui/switch';

import { useShowFolderSources } from '#/features/collections/collection-preference-hooks';
import type {
  SettingsSwitchRowProps,
  SettingsThemeOption,
} from '#/features/settings/settings.type';
import { SETTINGS_THEME_PREFERENCES } from '#/features/settings/settings.type';
import { useSettingsTheme } from '#/features/settings/settings-theme-hooks';

const THEME_TITLE_ID = 'settings-theme-title';
const COLLECTIONS_TITLE_ID = 'settings-collections-title';

const THEME_OPTIONS: readonly SettingsThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun03Icon },
  { value: 'dark', label: 'Dark', icon: Moon02Icon },
  { value: 'system', label: 'System', icon: ComputerIcon },
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
// LiquidTabs, so the theme switch moves like the library tabs.
function SettingsThemeSection() {
  const { preference, setPreference } = useSettingsTheme();

  return (
    <section
      aria-labelledby={THEME_TITLE_ID}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
    >
      <h3 id={THEME_TITLE_ID} className="t-l-2">
        Theme
      </h3>
      <LiquidTabs
        value={preference}
        onValueChange={(value) => {
          const next = SETTINGS_THEME_PREFERENCES.find(
            (item) => item === value,
          );
          if (next) setPreference(next);
        }}
      >
        <LiquidTabsList aria-labelledby={THEME_TITLE_ID} className="bg-muted">
          {THEME_OPTIONS.map((option) => (
            <LiquidTabsTrigger
              key={option.value}
              value={option.value}
              icon={<HugeiconsIcon icon={option.icon} />}
            >
              {option.label}
            </LiquidTabsTrigger>
          ))}
        </LiquidTabsList>
      </LiquidTabs>
    </section>
  );
}

// *** SettingsCollectionsSection ***
function SettingsCollectionsSection() {
  const { showFolderSources, setShowFolderSources } = useShowFolderSources();

  return (
    <section aria-labelledby={COLLECTIONS_TITLE_ID} className="space-y-4">
      <h3 id={COLLECTIONS_TITLE_ID} className="t-l-2">
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
        <span id={labelId} className="block t-b-3">
          {label}
        </span>
        <span id={hintId} className="block t-b-4 text-muted-fg">
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
