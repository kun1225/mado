import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
} from 'react';
import type {
  CSSProperties,
  ElementType,
  ReactElement,
  ReactNode,
} from 'react';

import { cn } from '@repo/ui/cn';

/**
 * Words slide up, fade in and sharpen one after another when the text scrolls into view.
 * Faster than a motion value per word: one shared observer flips one attribute,
 * and CSS runs every word's transition on the compositor.
 */
export function RevealText({
  as: Tag = 'p',
  trigger = 'view',
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  /** `manual` waits for `revealWithin`, for text that plays after an intro. */
  trigger?: 'view' | 'manual';
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRevealOnView(trigger === 'view');
  const counter = { next: 0 };

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={className}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {splitWords(children, counter)}
    </Tag>
  );
}

/** The same slide, fade and sharpen, for a whole element instead of words. */
export function Reveal({
  as: Tag = 'div',
  trigger = 'view',
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  trigger?: 'view' | 'manual';
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRevealOnView(trigger === 'view');

  return (
    <Tag
      ref={ref}
      data-reveal=""
      className={cn(REVEAL_BLOCK, className)}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Reveals every `trigger="manual"` reveal inside `root`. */
export function revealWithin(root: Element) {
  root
    .querySelectorAll('[data-reveal]')
    .forEach((element) => element.setAttribute('data-revealed', ''));
}

const MOTION_RESET =
  'motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none';

const REVEAL_WORD = cn(
  'inline-block translate-y-[0.4em] opacity-0 blur-[5px]',
  'transition-[translate,opacity,filter] duration-[900ms] ease-out-quart',
  'delay-[calc(var(--reveal-delay,0ms)+var(--i)*45ms)]',
  'in-data-revealed:translate-y-0 in-data-revealed:opacity-100 in-data-revealed:blur-none',
  MOTION_RESET,
);

const REVEAL_BLOCK = cn(
  'translate-y-6 opacity-0 blur-[5px]',
  'transition-[translate,opacity,filter] delay-(--reveal-delay) duration-[1000ms] ease-out-quart',
  'data-revealed:translate-y-0 data-revealed:opacity-100 data-revealed:blur-none',
  MOTION_RESET,
);

// *** useRevealOnView ***
function useRevealOnView(isEnabled: boolean) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!isEnabled || !element) return;
    const reveal = getRevealObserver();
    const reset = getResetObserver();
    reveal.observe(element);
    reset.observe(element);

    return () => {
      reveal.unobserve(element);
      reset.unobserve(element);
    };
  }, [isEnabled]);

  return ref;
}

// *** getRevealObserver ***
// One observer for the whole page. Elements stay observed so they can play again.
let revealObserver: IntersectionObserver | undefined;

function getRevealObserver() {
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting)
          entry.target.setAttribute('data-revealed', '');
      }
    },
    // Starts a little above the bottom edge, so the motion is seen, not missed.
    { rootMargin: '0px 0px -10% 0px' },
  );

  return revealObserver;
}

// *** getResetObserver ***
// Hides an element again once it is fully below the screen, so it plays when it
// scrolls up from the bottom next time. It has no root margin, unlike the reveal
// observer, so an element in the bottom 10% strip is not hidden while visible.
let resetObserver: IntersectionObserver | undefined;

function getResetObserver() {
  resetObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const isBelowScreen =
        !entry.isIntersecting && entry.boundingClientRect.top > 0;
      if (isBelowScreen) entry.target.removeAttribute('data-revealed');
    }
  });

  return resetObserver;
}

// *** splitWords ***
function splitWords(node: ReactNode, counter: { next: number }): ReactNode {
  if (typeof node === 'string') {
    return node
      .split(/(\s+)/)
      .filter(Boolean)
      .map((part) => {
        if (/^\s+$/.test(part)) return part;
        const order = counter.next++;

        return (
          <span
            key={order}
            className={REVEAL_WORD}
            style={{ '--i': order } as CSSProperties}
          >
            {part}
          </span>
        );
      });
  }

  if (Array.isArray(node)) {
    return Children.map(node, (child) => splitWords(child, counter));
  }

  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
    return cloneElement(
      node as ReactElement<{ children?: ReactNode }>,
      undefined,
      splitWords(node.props.children, counter),
    );
  }

  return node;
}
