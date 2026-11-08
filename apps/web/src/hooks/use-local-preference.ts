import { useSyncExternalStore } from 'react';
import { z } from 'zod';

export type LocalPreferenceOptions<T extends string> = {
  key: string;
  values: readonly [T, ...T[]];
  fallback: NoInfer<T>;
};

/** One small choice saved in this browser, shared by every component that reads it. */
export function createLocalPreference<T extends string>({
  key,
  values,
  fallback,
}: LocalPreferenceOptions<T>) {
  const schema = z.enum(values).catch(fallback);
  const listeners = new Set<() => void>();

  /** The server has no storage, so it uses the fallback and the client fixes it after hydration. */
  function usePreference() {
    const value = useSyncExternalStore(subscribe, read, () => fallback);
    return [value, store] as const;
  }

  // *** read ***
  // Storage can be blocked (private mode, site data off); the app still works on the fallback.
  function read(): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : schema.parse(JSON.parse(raw));
    } catch {
      return fallback;
    }
  }

  // *** store ***
  function store(value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save the ${key} setting`, error);
    }
    listeners.forEach((listener) => listener());
  }

  // *** subscribe ***
  function subscribe(listener: () => void) {
    listeners.add(listener);
    // So the choice updates when another tab changes it.
    window.addEventListener('storage', listener);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', listener);
    };
  }

  return { usePreference, read, store, subscribe };
}
