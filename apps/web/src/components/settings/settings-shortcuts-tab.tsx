import { SHORTCUT_LIST } from '#/features/shortcuts/shortcut-list';

export function SettingsShortcutsTab() {
  return (
    <dl className="divide-y divide-border">
      {SHORTCUT_LIST.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-4 py-3"
        >
          <dt className="t-b-3">{item.label}</dt>
          <dd className="flex flex-wrap justify-end gap-1.5">
            {item.keys.map((key) => (
              <kbd
                key={key}
                className="rounded-md border border-border bg-muted px-1.5 py-0.5 t-b-4 text-muted-fg"
              >
                {key}
              </kbd>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
