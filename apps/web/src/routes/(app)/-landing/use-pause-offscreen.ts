import { useEffect } from 'react';
import type { RefObject } from 'react';

import { useInView } from '#/hooks/use-in-view';

const SECTION_VIEWPORT = { rootMargin: '0px', threshold: 0 };

/**
 * One observer per section instead of per media element.
 * Videos pause off screen, and the caller sets `data-offscreen` so CSS loops pause too.
 */
export function usePauseOffscreen(sectionRef: RefObject<HTMLElement | null>) {
  const isInView = useInView(sectionRef, SECTION_VIEWPORT);

  useEffect(() => {
    sectionRef.current?.querySelectorAll('video').forEach((video) => {
      if (!isInView) return video.pause();
      // Only videos that autoplay resume, so reduced motion stays still.
      if (video.autoplay) {
        // A pause before play resolves rejects it; the next view plays again.
        video.play().catch(() => {});
      }
    });
  }, [sectionRef, isInView]);

  return isInView;
}
