import { useEffect } from 'react';

import { getShortcutAction, hasOpenOverlay, isTypingTarget } from './shortcuts';
import type { ShortcutHandlers, ShortcutTarget } from './shortcuts.type';

/**
 * Each caller passes only the actions it owns, so several can listen at once.
 * A key with no handler here is left alone, and the browser keeps its own meaning.
 */
export function useShortcuts(handlers: ShortcutHandlers, hasSelection = false) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Held keys would repeat the action, and IME input uses these keys to pick words.
      if (event.defaultPrevented || event.isComposing || event.repeat) return;

      const action = getShortcutAction(event, {
        hasSelection,
        isTyping: isTypingTarget(event.target as ShortcutTarget | null),
        isOverlayOpen: hasOpenOverlay(document),
      });
      const handler = action === null ? undefined : handlers[action];
      if (!handler) return;

      event.preventDefault();
      handler();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, hasSelection]);
}
