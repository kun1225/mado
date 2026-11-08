import { useEffect, useRef, useState } from 'react';

import { Button } from '@repo/ui/button';

import type { DesktopSitePreviewProps } from './desktop.type';
import { getDesktopBridge } from './desktop-bridge';
import type { DesktopSitePreviewBounds } from './desktop-bridge.type';

const HIDDEN_BOUNDS: DesktopSitePreviewBounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

export function DesktopSitePreview({
  url,
  name,
  thumbnailUrl,
  active,
  mediaRef,
}: DesktopSitePreviewProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const bridge = getDesktopBridge();
    const element = container.current;
    if (!bridge || !element || !active) return;

    const id = crypto.randomUUID();
    const popup = element.closest('[data-slot="dialog-content"]');
    let disposed = false;
    let loaded = false;
    let frame = 0;
    // The native view starts hidden, so only a change needs an IPC call.
    let previous = HIDDEN_BOUNDS;
    bridge.sitePreview
      .open({ id, url, bounds: HIDDEN_BOUNDS })
      .then((success) => {
        if (disposed) return;

        loaded = success;
        setFailed(!success);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    // The dialog flies in with a transform, which no observer reports, so the position is read every frame.
    const update = () => {
      if (disposed) return;
      frame = requestAnimationFrame(update);
      if (!loaded) return;

      const bounds = isVisible(popup, element)
        ? toBounds(element)
        : HIDDEN_BOUNDS;
      if (isSameBounds(bounds, previous)) return;
      previous = bounds;
      bridge.sitePreview.resize({ id, bounds }).catch(() => {
        if (!disposed) setFailed(true);
      });
    };

    frame = requestAnimationFrame(update);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      void bridge.sitePreview.close({ id }).catch((error: unknown) => {
        console.error('Could not close website preview', error);
      });
    };
  }, [url, active]);

  return (
    <div
      ref={(element) => {
        container.current = element;
        mediaRef(element);
      }}
      className="pointer-events-auto relative min-h-0 flex-1 overflow-hidden rounded-md bg-bg/10"
    >
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt={`Preview of ${name}`}
          className="absolute inset-0 size-full object-contain"
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="secondary"
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noreferrer" />}
          >
            Preview unavailable. Open website
          </Button>
        </div>
      )}
    </div>
  );
}

// *** isVisible ***
function isVisible(popup: Element | null, element: Element) {
  return (
    !isCovered(popup) &&
    !isMoving(popup, element) &&
    !popup?.hasAttribute('data-closed')
  );
}

// *** isCovered ***
// A native view always paints above the page, so another dialog on top must hide it.
function isCovered(popup: Element | null) {
  const dialogs = document.querySelectorAll(
    '[role="dialog"], [role="alertdialog"]',
  );
  return dialogs.length > 0 && dialogs[dialogs.length - 1] !== popup;
}

// *** isMoving ***
// Only the popup and the media move the view. Hover and focus transitions on buttons inside the popup must not hide it, or the page flashes.
function isMoving(popup: Element | null, element: Element) {
  return [popup, element].some((target) =>
    target
      ?.getAnimations()
      .some((animation) => animation.playState === 'running'),
  );
}

// *** toBounds ***
function toBounds(element: Element): DesktopSitePreviewBounds {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.max(0, rect.x),
    y: Math.max(0, rect.y),
    width: rect.width,
    height: rect.height,
  };
}

// *** isSameBounds ***
function isSameBounds(
  a: DesktopSitePreviewBounds,
  b: DesktopSitePreviewBounds,
) {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}
