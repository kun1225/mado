import type { SettingsThemeOption } from '#/features/settings/settings.type';
import { useSettingsTheme } from '#/features/settings/settings-theme-hooks';

const THEME_TITLE_ID = 'settings-theme-title';
const THEME_INPUT_NAME = 'settings-theme';

const THEME_OPTIONS: readonly SettingsThemeOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System', hint: 'Match your device settings.' },
];

// Native radios, so arrow keys and screen readers work with no extra code.
export function SettingsAppearanceTab() {
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
