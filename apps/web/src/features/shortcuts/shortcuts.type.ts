export type ShortcutAction =
  'focus-search' | 'show-shortcuts' | 'select-all' | 'delete-selected';

export type ShortcutKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
>;

export type ShortcutTarget = {
  tagName: string;
  isContentEditable?: boolean;
};

export type ShortcutContext = {
  hasSelection: boolean;
  isTyping: boolean;
  isOverlayOpen: boolean;
};

export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>;

export type ShortcutListItem = {
  label: string;
  /** Each entry is another way to do the same thing. */
  keys: readonly string[];
};
