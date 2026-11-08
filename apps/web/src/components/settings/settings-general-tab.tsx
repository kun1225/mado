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
} from '@repo/ui/liquid-tabs';
import { Switch } from '@repo/ui/switch';

import {
  useCollectionIcon,
  useShowFolderSources,
} from '#/features/collections/collection-preference-hooks';
import type { CollectionIconStyle } from '#/features/collections/collection-types';
import type {
  SettingsChoiceOption,
  SettingsChoiceRowProps,
  SettingsSwitchRowProps,
  SettingsThemeOption,
} from '#/features/settings/settings.type';
import { SETTINGS_THEME_PREFERENCES } from '#/features/settings/settings.type';
import { useSettingsTheme } from '#/features/settings/settings-theme-hooks';
import { useSourceCaption } from '#/features/sources/source-preferences';
import type { SourceCaptionPosition } from '#/features/sources/source-types';

const THEME_TITLE_ID = 'settings-theme-title';

const THEME_OPTIONS: readonly SettingsThemeOption[] = [
  { value: 'light', label: 'Light', icon: Sun03Icon },
  { value: 'dark', label: 'Dark', icon: Moon02Icon },
  { value: 'system', label: 'System', icon: ComputerIcon },
];

const COLLECTION_ICON_OPTIONS: readonly SettingsChoiceOption<CollectionIconStyle>[] =
  [
    { value: 'folder', label: 'Folder' },
    { value: 'book', label: 'Book' },
  ];

const SOURCE_CAPTION_OPTIONS: readonly SettingsChoiceOption<SourceCaptionPosition>[] =
  [
    { value: 'overlay', label: 'On hover' },
    { value: 'below', label: 'Below' },
  ];

// No section titles or hints: four settings read fine as one plain list.
export function SettingsGeneralTab() {
  const { showFolderSources, setShowFolderSources } = useShowFolderSources();
  const { collectionIcon, setCollectionIcon } = useCollectionIcon();
  const { sourceCaption, setSourceCaption } = useSourceCaption();

  return (
    <div className="space-y-5">
      <SettingsThemeRow />
      <SettingsChoiceRow
        id="settings-collection-icon"
        label="Collection look"
        value={collectionIcon}
        options={COLLECTION_ICON_OPTIONS}
        onChange={setCollectionIcon}
      />
      <SettingsChoiceRow
        id="settings-source-caption"
        label="Source names"
        value={sourceCaption}
        options={SOURCE_CAPTION_OPTIONS}
        onChange={setSourceCaption}
      />
      <SettingsSwitchRow
        id="settings-show-folder-sources"
        label="Include sub-folder sources"
        checked={showFolderSources}
        onCheckedChange={setShowFolderSources}
      />
    </div>
  );
}

// *** SettingsThemeRow ***
// LiquidTabs, so the theme switch moves like the library tabs.
function SettingsThemeRow() {
  const { preference, setPreference } = useSettingsTheme();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span id={THEME_TITLE_ID} className="t-b-3">
        Theme
      </span>
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
    </div>
  );
}

// *** SettingsChoiceRow ***
// LiquidTabs like the Theme row, so every choice in General moves the same way.
function SettingsChoiceRow<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: SettingsChoiceRowProps<T>) {
  const labelId = `${id}-label`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <span id={labelId} className="t-b-3">
        {label}
      </span>
      <LiquidTabs
        value={value}
        onValueChange={(next) => {
          const option = options.find((item) => item.value === next);
          if (option) onChange(option.value);
        }}
      >
        <LiquidTabsList aria-labelledby={labelId} className="bg-muted">
          {options.map((option) => (
            <LiquidTabsTrigger key={option.value} value={option.value}>
              {option.label}
            </LiquidTabsTrigger>
          ))}
        </LiquidTabsList>
      </LiquidTabs>
    </div>
  );
}

// *** SettingsSwitchRow ***
// The whole row is a label, so a click on the text flips the switch too.
function SettingsSwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: SettingsSwitchRowProps) {
  const labelId = `${id}-label`;

  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span id={labelId} className="t-b-3">
        {label}
      </span>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
      />
    </label>
  );
}
