import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

type InViewOptions = {
  rootMargin: string;
  threshold: number;
};

type InViewSharedObserver = {
  observer: IntersectionObserver;
  listeners: Map<Element, (isInView: boolean) => void>;
};

// One observer per option set, because hundreds of cards each owning one is
// far slower than one observer watching them all.
const observers = new Map<string, InViewSharedObserver>();

export function useInView(
  ref: RefObject<Element | null>,
  { rootMargin, threshold }: InViewOptions,
) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    return observe(element, { rootMargin, threshold }, setIsInView);
  }, [ref, rootMargin, threshold]);

  return isInView;
}

// *** observe ***
function observe(
  element: Element,
  options: InViewOptions,
  onChange: (isInView: boolean) => void,
) {
  const key = `${options.rootMargin}|${options.threshold}`;
  const shared = observers.get(key) ?? createInViewSharedObserver(options);
  observers.set(key, shared);

  shared.listeners.set(element, onChange);
  shared.observer.observe(element);

  return () => {
    shared.observer.unobserve(element);
    shared.listeners.delete(element);

    if (shared.listeners.size === 0) {
      shared.observer.disconnect();
      observers.delete(key);
    }
  };
}

// *** createInViewSharedObserver ***
function createInViewSharedObserver(
  options: InViewOptions,
): InViewSharedObserver {
  const listeners: InViewSharedObserver['listeners'] = new Map();

  // `isIntersecting` is true for any overlap, even below the threshold.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      listeners.get(entry.target)?.(
        entry.isIntersecting && entry.intersectionRatio >= options.threshold,
      );
    });
  }, options);

  return { observer, listeners };
}

export { observe };
