import type { RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

import { eases } from './motion';

const HIDDEN_CLIP = 'inset(50% 50% 50% 50%)';
const NO_MOTION = { duration: 0 };

/**
 * Clips a full-size layer down to the element that matches `selector`, and slides the clip when it changes.
 * The layer must be `absolute inset-0` inside the container that holds the targets.
 * Pass `null` to hide it.
 */
export function useClipHighlight(
  layerRef: RefObject<HTMLElement | null>,
  selector: string | null,
) {
  const reduceMotion = useReducedMotion();
  // The first placement must not slide in from wherever the clip was hidden.
  const placed = useRef(false);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const container = layer?.parentElement;
    const target = selector
      ? container?.querySelector<HTMLElement>(selector)
      : null;

    if (!layer || !container || !target) {
      if (layer) layer.style.clipPath = HIDDEN_CLIP;
      placed.current = false;
      return;
    }

    const move = (instant: boolean) => {
      animate(
        layer,
        { clipPath: clipTo(layer, container, target) },
        instant ? NO_MOTION : eases.inOut,
      );
    };

    move(!placed.current || Boolean(reduceMotion));
    placed.current = true;

    // ResizeObserver fires once right away with the size we just measured.
    // Skipping it keeps the slide from being cut short.
    let observed = false;
    const observer = new ResizeObserver(() => {
      if (!observed) {
        observed = true;
        return;
      }
      move(true);
    });
    observer.observe(layer);
    observer.observe(target);

    return () => observer.disconnect();
  }, [layerRef, selector, reduceMotion]);
}

// *** clipTo ***
// Offsets, not bounding rects, because a scaling dialog or panel would skew the numbers.
function clipTo(
  layer: HTMLElement,
  container: HTMLElement,
  target: HTMLElement,
) {
  const { top, left } = offsetWithin(target, container);
  const right = layer.offsetWidth - left - target.offsetWidth;
  const bottom = layer.offsetHeight - top - target.offsetHeight;
  const radius = getComputedStyle(target).borderRadius;
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius})`;
}

// *** offsetWithin ***
function offsetWithin(element: HTMLElement, container: HTMLElement) {
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = element;
  while (node && node !== container) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { top, left };
}
