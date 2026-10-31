import type { ShortcutListItem } from './shortcuts.type';

/** Shown in Settings → Shortcuts. Change it together with the keys it describes. */
export const SHORTCUT_LIST: readonly ShortcutListItem[] = [
  { label: 'Search', keys: ['/', 'Cmd/Ctrl + K'] },
  { label: 'Select all saves', keys: ['Cmd/Ctrl + A'] },
  { label: 'Delete selected saves', keys: ['Delete', 'Backspace'] },
  { label: 'Clear the selection', keys: ['Esc'] },
  { label: 'Open the previous or next save', keys: ['←', '→'] },
  { label: 'Edit a text save', keys: ['E'] },
  { label: 'Add a save from the clipboard', keys: ['Cmd/Ctrl + V'] },
  { label: 'Show this list', keys: ['?'] },
];
