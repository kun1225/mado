import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import type MasonryLayout from 'masonry-layout';
import type { ReactNode } from 'react';

const ITEM_CLASS = 'masonry-item';
const COLUMN_SIZER_CLASS = 'masonry-column-sizer';

const TRANSITION_DURATION = 400;

const GUTTER = 16;

const COLUMN_CLASS = cn(
  'w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]',
);

/**
 * Wraps the `masonry-layout` package, which positions items imperatively and
 * knows nothing about React.
 *
 * Items keep whatever height their content asks for, so `columnClassName` only
 * sets the width of one column. It has to leave room for the gutters, which
 * sit between columns but not outside them: four columns with a 16px gutter
 * need `w-[calc((100%-3rem)/4)]`, since three gaps fall between four columns.
 */
export function Masonry<TItem>({
  items,
  getKey,
  children,
  columnClassName = COLUMN_CLASS,
  gutter = GUTTER,
}: {
  items: TItem[];
  getKey: (item: TItem) => string;
  children: (item: TItem) => ReactNode;
  columnClassName?: string;
  gutter?: number;
}) {
  const containerRef = useRef<HTMLUListElement>(null);
  const sizerRef = useRef<HTMLLIElement>(null);
  const masonryRef = useRef<MasonryLayout | null>(null);
  const [isLaidOut, setIsLaidOut] = useState(false);

  /**
   * `masonry-layout` reads `window` while it loads, so it can only be imported
   * once we are in the browser.
   */
  useEffect(() => {
    const container = containerRef.current;
    const sizer = sizerRef.current;

    if (!container || !sizer) return;

    let isCancelled = false;
    let observer: ResizeObserver | undefined;

    import('masonry-layout')
      .then(({ default: MasonryLayout }) => {
        if (isCancelled) return;

        const masonry = new MasonryLayout(container, {
          itemSelector: `.${ITEM_CLASS}`,
          columnWidth: `.${COLUMN_SIZER_CLASS}`,
          percentPosition: true,
          gutter,
          horizontalOrder: true,
          transitionDuration: TRANSITION_DURATION,
          resize: false,
        });

        masonryRef.current = masonry;
        setIsLaidOut(true);

        observer = new ResizeObserver(() => {
          masonry.option?.({ transitionDuration: 0 });
          masonry.layout?.();
          masonry.option?.({ transitionDuration: TRANSITION_DURATION });
        });
        observer.observe(sizer);
      })
      .catch((error: unknown) => {
        console.error('Failed to load the masonry layout.', error);
        setIsLaidOut(true);
      });

    return () => {
      isCancelled = true;
      observer?.disconnect();
      masonryRef.current?.destroy?.();
      masonryRef.current = null;
    };
  }, [gutter]);

  useEffect(() => {
    masonryRef.current?.reloadItems?.();
    masonryRef.current?.layout?.();
  }, [items]);

  return (
    <ul
      ref={containerRef}
      className={cn(
        'duration-slow ease-standard transition-opacity',
        isLaidOut ? 'opacity-100' : 'opacity-0',
      )}
    >
      <li
        ref={sizerRef}
        aria-hidden
        className={cn(COLUMN_SIZER_CLASS, columnClassName)}
      />

      {items.map((item) => (
        <li
          key={getKey(item)}
          style={{ marginBottom: gutter }}
          className={cn(ITEM_CLASS, columnClassName)}
        >
          {children(item)}
        </li>
      ))}
    </ul>
  );
}
