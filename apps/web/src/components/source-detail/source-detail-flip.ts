import type {
  SourceDetailFlipAnchor,
  SourceDetailFlipBox,
  SourceDetailFlipDirection,
} from './source-detail-flip.type';

const FLIP_ID = 'source-detail-flip';
const FLIP_DURATION = 400;
// --poise-ease-out-quint: a fast start that settles, so the media reads as
// thrown from the card rather than slid.
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CHROME_SELECTOR = '[data-flip-chrome]';
const OVERLAY_SELECTOR = '[data-slot="dialog-overlay"]';

const CLOSE_FADE: Keyframe[] = [
  { opacity: 1, filter: 'blur(0px)' },
  { opacity: 1, filter: 'blur(0px)', offset: 0.5 },
  // The media is scaled down by now, so this reads as a few px on screen.
  { opacity: 0, filter: 'blur(8px)' },
];

/**
 * Grows the viewer media out of its grid card (FLIP), or shrinks it back.
 * Returns false when there is no card on screen to fly to, so the caller keeps
 * the dialog's plain fade.
 */
export function flipSourceDetail({
  media,
  sourceId,
  aspectRatio,
  direction,
  anchor = 'center',
}: {
  media: HTMLElement;
  sourceId: string;
  /** Width / height of the picture, which `object-contain` letterboxes inside `media`. */
  aspectRatio: number | null;
  direction: SourceDetailFlipDirection;
  anchor?: SourceDetailFlipAnchor;
}): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return false;

  const popup = media.closest<HTMLElement>('[data-slot="dialog-content"]');
  const tile = findVisibleCard(sourceId);
  if (popup === null || tile === null) return false;

  const chrome = [...popup.querySelectorAll<HTMLElement>(CHROME_SELECTOR)];
  const overlay =
    popup.parentElement?.querySelector<HTMLElement>(OVERLAY_SELECTOR);
  // A flip that starts mid-flight must measure at rest. A reopen during the
  // close would also stay invisible behind the close's `forwards` fills.
  cancelFlips([media, popup, overlay, ...chrome]);

  const mediaBox = media.getBoundingClientRect();
  const content = aspectRatio ? containBox(mediaBox, aspectRatio) : mediaBox;
  const at = flipFrame({
    tile: tile.getBoundingClientRect(),
    media: mediaBox,
    content,
    tileRadius: parseFloat(getComputedStyle(tile).borderTopLeftRadius) || 0,
    anchor,
  });
  const rest = {
    transformOrigin: at.transformOrigin,
    transform: 'translate(0px, 0px) scale(1)',
    clipPath: restClipPath(mediaBox, content),
  };
  const isOpen = direction === 'open';

  // The popup's own CSS fade would fade the media too, so only the toolbar
  // and panel fade while the media stays solid.
  if (isOpen) popup.getAnimations().forEach((animation) => animation.finish());
  fadeChrome(chrome, direction);

  media.animate(isOpen ? [at, rest] : [rest, at], {
    id: FLIP_ID,
    duration: FLIP_DURATION,
    easing: FLIP_EASING,
    fill: isOpen ? 'none' : 'forwards',
  });

  if (!isOpen) {
    // The paused frame rarely matches the card underneath, so let the card
    // show through as the media lands on it rather than swapping at the end.
    media.animate(CLOSE_FADE, {
      id: FLIP_ID,
      duration: FLIP_DURATION,
      easing: 'ease-out',
      fill: 'forwards',
    });
    // Base UI unmounts once the popup's own animations finish, and the morph
    // runs on a child, so this empty one holds the popup until it lands.
    popup.animate([], { id: FLIP_ID, duration: FLIP_DURATION });
    // Its own fast fade ends before the media lands, and it would snap back
    // until the popup unmounts.
    overlay?.animate(
      { opacity: [1, 0] },
      {
        id: FLIP_ID,
        duration: FLIP_DURATION,
        easing: 'ease-out',
        fill: 'forwards',
      },
    );
  }

  return true;
}

// *** findVisibleCard ***
function findVisibleCard(sourceId: string): HTMLElement | null {
  const card = document.querySelector<HTMLElement>(
    `[data-source-card="${CSS.escape(sourceId)}"]`,
  );
  if (card === null) return null;

  const box = card.getBoundingClientRect();
  const isOnScreen = box.bottom > 0 && box.top < window.innerHeight;
  return isOnScreen ? card : null;
}

// *** cancelFlips ***
function cancelFlips(elements: (HTMLElement | null | undefined)[]) {
  elements.forEach((element) => {
    element
      ?.getAnimations()
      .filter((animation) => animation.id === FLIP_ID)
      .forEach((animation) => animation.cancel());
  });
}

// *** containBox ***
/** Where `object-contain` draws a picture of this ratio inside `box`. */
function containBox(
  box: SourceDetailFlipBox,
  aspectRatio: number,
): SourceDetailFlipBox {
  const isWider = aspectRatio > box.width / box.height;
  const width = isWider ? box.width : box.height * aspectRatio;
  const height = isWider ? box.width / aspectRatio : box.height;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  };
}

// *** flipFrame ***
/**
 * The media's keyframe when it sits on the card. It scales uniformly, so the
 * picture never stretches, just enough to cover the card, and clips to the
 * card's box around the centre of the picture.
 */
function flipFrame({
  tile,
  media,
  content,
  tileRadius,
  anchor = 'center',
}: {
  tile: SourceDetailFlipBox;
  media: SourceDetailFlipBox;
  content: SourceDetailFlipBox;
  tileRadius: number;
  anchor?: SourceDetailFlipAnchor;
}) {
  const scale = Math.max(
    tile.width / content.width,
    tile.height / content.height,
  );
  const clipWidth = tile.width / scale;
  const clipHeight = tile.height / scale;
  const originX = content.left - media.left + content.width / 2;
  const originY =
    content.top -
    media.top +
    (anchor === 'top' ? clipHeight / 2 : content.height / 2);
  const dx = tile.left + tile.width / 2 - (media.left + originX);
  const dy = tile.top + tile.height / 2 - (media.top + originY);
  const insetLeft = originX - clipWidth / 2;
  const insetRight = media.width - (originX + clipWidth / 2);
  const insetTop = originY - clipHeight / 2;
  const insetBottom = media.height - (originY + clipHeight / 2);

  return {
    transformOrigin: `${originX}px ${originY}px`,
    transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
    clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px round ${tileRadius / scale}px)`,
  };
}

// *** restClipPath ***
/** Same inset shape as the card frame, so the browser can tween between them. */
function restClipPath(
  media: SourceDetailFlipBox,
  content: SourceDetailFlipBox,
) {
  const top = content.top - media.top;
  const left = content.left - media.left;
  const bottom = media.height - (top + content.height);
  const right = media.width - (left + content.width);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 0px)`;
}

// *** fadeChrome ***
function fadeChrome(
  chrome: HTMLElement[],
  direction: SourceDetailFlipDirection,
) {
  const isOpen = direction === 'open';
  chrome.forEach((element) => {
    element.animate(
      { opacity: isOpen ? [0, 1] : [1, 0] },
      {
        id: FLIP_ID,
        duration: isOpen ? FLIP_DURATION : FLIP_DURATION / 2,
        easing: 'ease-out',
        fill: isOpen ? 'none' : 'forwards',
      },
    );
  });
}

export { containBox, flipFrame };
