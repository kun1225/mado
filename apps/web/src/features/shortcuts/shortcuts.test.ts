import { describe, expect, it } from 'vitest';

import { getShortcutAction, hasOpenOverlay, isTypingTarget } from './shortcuts';
import type { ShortcutContext, ShortcutKeyEvent } from './shortcuts.type';

const IDLE: ShortcutContext = {
  hasSelection: false,
  isTyping: false,
  isOverlayOpen: false,
};

function press(
  key: string,
  modifiers: Partial<Omit<ShortcutKeyEvent, 'key'>> = {},
): ShortcutKeyEvent {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

describe('getShortcutAction', () => {
  describe('search', () => {
    it('focuses search on /', () => {
      expect(getShortcutAction(press('/'), IDLE)).toBe('focus-search');
    });

    it('focuses search on Cmd+K and Ctrl+K', () => {
      expect(getShortcutAction(press('k', { metaKey: true }), IDLE)).toBe(
        'focus-search',
      );
      expect(getShortcutAction(press('k', { ctrlKey: true }), IDLE)).toBe(
        'focus-search',
      );
    });

    it('reads Cmd+K with caps lock on', () => {
      expect(getShortcutAction(press('K', { metaKey: true }), IDLE)).toBe(
        'focus-search',
      );
    });

    it('ignores a plain k', () => {
      expect(getShortcutAction(press('k'), IDLE)).toBeNull();
    });

    it('ignores K with extra modifiers', () => {
      expect(
        getShortcutAction(press('k', { metaKey: true, shiftKey: true }), IDLE),
      ).toBeNull();
      expect(
        getShortcutAction(press('k', { metaKey: true, altKey: true }), IDLE),
      ).toBeNull();
    });
  });

  describe('shortcut list', () => {
    it('opens the list on ?', () => {
      expect(getShortcutAction(press('?', { shiftKey: true }), IDLE)).toBe(
        'show-shortcuts',
      );
    });

    it('leaves Cmd+? to the browser', () => {
      expect(
        getShortcutAction(press('?', { metaKey: true, shiftKey: true }), IDLE),
      ).toBeNull();
    });
  });

  describe('select all', () => {
    it('selects all on Cmd+A and Ctrl+A', () => {
      expect(getShortcutAction(press('a', { metaKey: true }), IDLE)).toBe(
        'select-all',
      );
      expect(getShortcutAction(press('a', { ctrlKey: true }), IDLE)).toBe(
        'select-all',
      );
    });

    it('ignores a plain a', () => {
      expect(getShortcutAction(press('a'), IDLE)).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes the selection on Delete and Backspace', () => {
      const selecting = { ...IDLE, hasSelection: true };

      expect(getShortcutAction(press('Delete'), selecting)).toBe(
        'delete-selected',
      );
      expect(getShortcutAction(press('Backspace'), selecting)).toBe(
        'delete-selected',
      );
    });

    it('does nothing when nothing is selected', () => {
      expect(getShortcutAction(press('Delete'), IDLE)).toBeNull();
      expect(getShortcutAction(press('Backspace'), IDLE)).toBeNull();
    });

    it('ignores Delete with a modifier', () => {
      const selecting = { ...IDLE, hasSelection: true };

      expect(
        getShortcutAction(press('Delete', { shiftKey: true }), selecting),
      ).toBeNull();
    });
  });

  describe('while typing', () => {
    const typing = { ...IDLE, hasSelection: true, isTyping: true };

    it('leaves plain keys and Cmd+A to the text field', () => {
      expect(getShortcutAction(press('/'), typing)).toBeNull();
      expect(
        getShortcutAction(press('?', { shiftKey: true }), typing),
      ).toBeNull();
      expect(
        getShortcutAction(press('a', { metaKey: true }), typing),
      ).toBeNull();
      expect(getShortcutAction(press('Delete'), typing)).toBeNull();
      expect(getShortcutAction(press('Backspace'), typing)).toBeNull();
    });

    it('still focuses search on Cmd+K', () => {
      expect(getShortcutAction(press('k', { metaKey: true }), typing)).toBe(
        'focus-search',
      );
    });
  });

  describe('while a dialog or menu is open', () => {
    const inDialog = { ...IDLE, hasSelection: true, isOverlayOpen: true };

    it('turns every shortcut off', () => {
      expect(getShortcutAction(press('/'), inDialog)).toBeNull();
      expect(
        getShortcutAction(press('k', { metaKey: true }), inDialog),
      ).toBeNull();
      expect(
        getShortcutAction(press('a', { metaKey: true }), inDialog),
      ).toBeNull();
      expect(getShortcutAction(press('Delete'), inDialog)).toBeNull();
    });
  });
});

describe('isTypingTarget', () => {
  it('is true for text fields and selects', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true);
  });

  it('is true for editable content', () => {
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(
      true,
    );
  });

  it('is false for buttons, the page, and nothing', () => {
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isTypingTarget({ tagName: 'BODY' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('hasOpenOverlay', () => {
  it('asks the page for a dialog, an alert dialog or a menu', () => {
    const selectors: string[] = [];
    const page = {
      querySelector: (selector: string) => {
        selectors.push(selector);
        return null;
      },
    };

    expect(hasOpenOverlay(page)).toBe(false);
    expect(selectors.join(',')).toContain('[role="dialog"]');
    expect(selectors.join(',')).toContain('[role="alertdialog"]');
    expect(selectors.join(',')).toContain('[role="menu"]');
  });

  it('is true when one is found', () => {
    expect(hasOpenOverlay({ querySelector: () => ({}) })).toBe(true);
  });
});
