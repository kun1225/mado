import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import type MasonryLayout from 'masonry-layout';
import type { ReactNode } from 'react';

const ITEM_CLASS = 'masonry-item';
const COLUMN_SIZER_CLASS = 'masonry-column-sizer';

const TRANSITION_DURATION = 400;

const GUTTER = 10;

const COLUMN_CLASS = cn(
  'w-[calc((100%-10px)/2)] md:w-[calc((100%-20px)/3)] lg:w-[calc((100%-30px)/4)]',
);

/**
 * `columnClassName` sets only the width, and must leave room for the gaps
 * between columns: 4 columns with a 10px gap need `w-[calc((100%-30px)/4)]`,
 * because 3 gaps sit between 4 columns.
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

  const keys = items.map(getKey);
  const [seenKeys, setSeenKeys] = useState<ReadonlySet<string>>(
    () => new Set(keys),
  );

  const enteringKeys = keys.filter((key) => !seenKeys.has(key));
  // A string, so `useEffect` reruns only when the entering keys change.
  const enteringSignature = enteringKeys.join('\n');

  useEffect(() => {
    if (enteringKeys.length === 0) return;

    const timer = setTimeout(
      () => {
        setSeenKeys((seen) => new Set([...seen, ...enteringKeys]));
      },
      (TRANSITION_DURATION * 2) / 3,
    );

    return () => clearTimeout(timer);
  }, [enteringSignature]);

  // `masonry-layout` reads `window` when it loads, so import it only in the browser.
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
        'transition-opacity duration-slow ease-standard',
        isLaidOut ? 'opacity-100' : 'opacity-0',
      )}
    >
      <li
        ref={sizerRef}
        aria-hidden
        className={cn(COLUMN_SIZER_CLASS, columnClassName)}
      />

      {items.map((item) => {
        const key = getKey(item);

        return (
          <li
            key={key}
            style={{ marginBottom: gutter }}
            className={cn(ITEM_CLASS, columnClassName)}
          >
            <div
              className={cn(
                'transition-[opacity,filter] duration-slow ease-standard',
                seenKeys.has(key)
                  ? 'opacity-100 blur-none'
                  : 'opacity-0 blur-md',
              )}
            >
              {children(item)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
