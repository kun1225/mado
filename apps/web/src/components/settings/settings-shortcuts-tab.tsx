import { Kbd, KbdGroup } from '@repo/ui/kbd';

import { SHORTCUT_LIST } from '#/features/shortcuts/shortcut-list';

const KEY_SEPARATOR = ' + ';

export function SettingsShortcutsTab() {
  return (
    <dl className="divide-y divide-border">
      {SHORTCUT_LIST.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-4 py-3"
        >
          <dt className="t-b-3">{item.label}</dt>
          <dd className="flex flex-wrap items-center justify-end gap-1.5">
            {item.keys.map((key, index) => (
              <span key={key} className="contents">
                {index > 0 && <span className="t-b-4 text-muted-fg">or</span>}
                <SettingsShortcutKeys keys={key} />
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// *** SettingsShortcutKeys ***
// A combo like "Cmd/Ctrl + K" is one chip per key with a plus between, so each key reads on its own.
function SettingsShortcutKeys({ keys }: { keys: string }) {
  const parts = keys.split(KEY_SEPARATOR);

  return (
    <KbdGroup>
      {parts.map((part, index) => (
        <span key={part} className="contents">
          {index > 0 && <span className="text-muted-fg">+</span>}
          <Kbd>{part}</Kbd>
        </span>
      ))}
    </KbdGroup>
  );
}
