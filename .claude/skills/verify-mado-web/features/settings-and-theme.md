# Settings and theme

A user opens the settings dialog from the dock, picks Light, Dark or System, and turns folder sources on or off. The dialog lives in the URL, so a link can open it. The choice is saved in `localStorage` and applied before the page paints. Spec: `apps/web/src/features/settings/settings.spec.md`, and `collections.spec.md` for the folder switch.

## Sub-features

- `settings-open` the Settings button opens the dialog at `?settings=general`.
- `settings-tabs` the sidebar switches between General and Data and replaces the URL.
- `settings-theme` Light, Dark and System set `html.dark` and `mado:theme`.
- `settings-theme-reload` a saved choice survives a reload with no flash.
- `settings-folder-switch` the `Show sources from folders` switch is saved in `localStorage`.
- `settings-link` `?settings=data` opens the Data tab directly, and closing removes the param.

## How to get to it (user POV)

- Button `Settings` at the end of the dock's search bar.
- A link with `?settings=general` or `?settings=data`.
- There is no Account tab: every sign-in flag is off in development, so the app is a guest.

## Driving it with playwright-cli

Preconditions: the baseline in `README.md`, on `/library`.

- **Open.** `$S/pw.sh click "getByRole('button', { name: 'Settings' })"`. The URL has `settings=general`, and a `dialog "General"` appears with the tabs `Light`, `Dark`, `System` and the switch `Show sources from folders` (checked).
- **Dark.** `$S/pw.sh click "getByRole('tab', { name: 'Dark' })"`. Then `$S/pw.sh --raw eval "JSON.stringify({dark: document.documentElement.classList.contains('dark'), stored: localStorage.getItem('mado:theme')})"` → `dark: true, stored: "dark"`.
- **Survives reload.** `$S/pw.sh reload` and `$S/wait-ready.sh`, then the same `eval` → `dark: true`. To check there is no flash, run `$S/pw.sh --raw eval "document.documentElement.classList.contains('dark')"` as the first command after `goto`.
- **Light and System.** Click `Light`: `dark: false, stored: "light"`. Click `System`: `stored` is `"system"` or null, and `dark` follows `matchMedia('(prefers-color-scheme: dark)').matches`.
- **Folder switch.** `$S/pw.sh click "getByRole('switch', { name: 'Show sources from folders' })"`. The switch is unchecked, and `$S/pw.sh --raw eval "localStorage.getItem('mado:show-folder-sources')"` holds the new value (the guest key has no account suffix). Click it again to restore.
- **Tabs and URL.** Click the sidebar button `Data`: the URL has `settings=data` (not a new history entry), and headings `Storage` and `Backup` appear. Click `Close settings`: the URL has no `settings` param.
- **Link.** `$S/pw.sh goto "http://localhost:3199/library?settings=data"` and `$S/wait-ready.sh`: the dialog opens on Data.
- **Proof.** A screenshot in Light and one in Dark (`evidence/settings-light.png`, `evidence/settings-dark.png`), the snapshot of the dialog, and the `eval` outputs, named `settings-<step>`.

## Gotchas

- The tabs are `tab` roles inside the dialog (LiquidTabs), not radios. The sidebar entries are `button` roles.
- The in-memory profile starts with no `mado:theme`, so System is the default.
- Playwright's browser follows the device theme. Do not assume `dark` is false under System.
- Colors fade during a theme switch. Take the screenshot after about 500 ms.
- Closing the dialog also drops the other settings params. The rest of the query string stays.
- The folder switch affects counts and what a collection page shows: check it with a parent and a folder (see `collections.md`) when the change is about nesting.
