import { useEffect, useRef } from 'react';

import { cn } from '@repo/ui/cn';

import type { ScrollFadeProps } from './scroll-fade.type';

export function ScrollFade({
  className,
  contentClassName,
  children,
}: ScrollFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollEdgeAttributes(ref);

  return (
    <div ref={ref} className={cn('scroll-fade-x', className)}>
      <div className={cn('w-max', contentClassName)}>{children}</div>
    </div>
  );
}

// *** useScrollEdgeAttributes ***
function useScrollEdgeAttributes(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    // Browsers with scroll timelines fade in CSS alone.
    if (!el || CSS.supports('animation-timeline: scroll()')) return;

    const update = () => {
      // 1px slack: scroll positions can be fractional.
      el.toggleAttribute('data-scroll-start', el.scrollLeft <= 1);
      el.toggleAttribute(
        'data-scroll-end',
        el.scrollLeft >= el.scrollWidth - el.clientWidth - 1,
      );
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // Cards load after the first paint, so the content width changes on its own.
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [ref]);
}
