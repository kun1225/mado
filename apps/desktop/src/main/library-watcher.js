import { watch } from 'node:fs';
import { sep } from 'node:path';

// Editors and agents often write a file in several steps. Waiting lets them finish.
const SETTLE_MS = 150;

/**
 * Calls `onChange('sources' | 'collections')` when a record file changed outside
 * the app. Returns a function that stops watching.
 */
export function watchLibrary(root, library, onChange) {
  const timers = new Map();

  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const relativePath = filename.split(sep).join('/');
    // Media is written in many chunks and is not a record.
    if (relativePath.startsWith('media/')) return;

    clearTimeout(timers.get(relativePath));
    timers.set(
      relativePath,
      setTimeout(() => {
        timers.delete(relativePath);
        void syncAndReport(library, relativePath, onChange);
      }, SETTLE_MS),
    );
  });

  return () => {
    watcher.close();
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  };
}

// *** syncAndReport ***
async function syncAndReport(library, relativePath, onChange) {
  try {
    const result = await library.syncFromDisk(relativePath);
    if (result !== 'updated') return;
    onChange(relativePath.startsWith('sources/') ? 'sources' : 'collections');
  } catch (error) {
    // A watcher must never crash the app, and the next change tries again.
    console.error(`Failed to reload ${relativePath}`, error);
  }
}
