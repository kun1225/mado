import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// *** subscribe ***
function subscribe(onChange: () => void) {
  const query = matchMedia(QUERY);
  query.addEventListener('change', onChange);

  return () => query.removeEventListener('change', onChange);
}

// *** getSnapshot ***
function getSnapshot() {
  return matchMedia(QUERY).matches;
}

// *** getServerSnapshot ***
function getServerSnapshot() {
  return false;
}
