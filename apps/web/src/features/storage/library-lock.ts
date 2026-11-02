const LOCK_NAME = 'mado-library-write';

let queueTail: Promise<unknown> = Promise.resolve();

/**
 * Runs a read-then-write as one step, so two edits at once can't both read the
 * same old record and lose one change. IndexedDB gave us this for free with a
 * transaction, but the store can't hold one open across a desktop IPC call.
 *
 * Never call a locked function from inside another one. It would wait for itself.
 */
export function withLibraryLock<T>(task: () => Promise<T>): Promise<T> {
  // The Web Locks API also covers a second browser tab. Some runtimes (Node in the tests) lack it, which the DOM types don't show.
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(LOCK_NAME, task);
  }

  const run = queueTail.then(task);
  queueTail = run.catch(() => undefined);
  return run;
}
