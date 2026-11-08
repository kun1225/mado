import type {
  ShortcutAction,
  ShortcutContext,
  ShortcutKeyEvent,
  ShortcutListItem,
  ShortcutTarget,
} from './shortcuts.type';

/** Returns what a key press means, or null when the app should ignore it. */
export function getShortcutAction(
  event: ShortcutKeyEvent,
  context: ShortcutContext,
): ShortcutAction | null {
  // A dialog or an open menu owns the keyboard, so the library behind it must not react.
  if (context.isOverlayOpen) return null;

  const action = matchKey(event, context.hasSelection);
  if (action === null) return null;

  // A text field needs its own keys. Cmd/Ctrl+K is the one exception, because it types nothing.
  const isSearchCommand = action === 'focus-search' && hasCommandKey(event);
  if (context.isTyping && !isSearchCommand) return null;

  return action;
}

// *** matchKey ***
function matchKey(
  event: ShortcutKeyEvent,
  hasSelection: boolean,
): ShortcutAction | null {
  const key = event.key.toLowerCase();

  if (hasCommandKey(event)) {
    // Shift or Alt makes it a different shortcut that the browser may own.
    if (event.altKey || event.shiftKey) return null;
    if (key === 'k') return 'focus-search';
    if (key === 'a') return 'select-all';
    return null;
  }

  if (event.altKey) return null;
  if (key === '/') return 'focus-search';
  if (key === '?') return 'show-shortcuts';

  const isDeleteKey = key === 'delete' || key === 'backspace';
  if (isDeleteKey && !event.shiftKey && hasSelection) return 'delete-selected';

  return null;
}

// *** hasCommandKey ***
// Mac uses Cmd and everyone else uses Ctrl, so either one counts.
function hasCommandKey(event: ShortcutKeyEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

// *** isTypingTarget ***
const TYPING_TAGS: ReadonlySet<string> = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
]);

export function isTypingTarget(target: ShortcutTarget | null): boolean {
  if (target === null) return false;

  return TYPING_TAGS.has(target.tagName) || target.isContentEditable === true;
}

// *** hasOpenOverlay ***
// Delete would otherwise remove the selection from behind a card's open context menu.
export function hasOpenOverlay(page: {
  querySelector: (selector: string) => unknown;
}): boolean {
  return (
    page.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"]',
    ) !== null
  );
}

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
