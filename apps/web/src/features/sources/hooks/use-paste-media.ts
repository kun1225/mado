import { useEffect } from 'react';

import {
  detectPastedContent,
  isEditablePasteTarget,
} from '#/features/sources/source-clipboard';

export function usePasteMedia(onPaste: (file: File) => void) {
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      if (isEditablePasteTarget(event.target)) return;

      const content = detectPastedContent(event.clipboardData);
      if (content.kind !== 'media') return;

      event.preventDefault();
      onPaste(content.file);
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onPaste]);
}
