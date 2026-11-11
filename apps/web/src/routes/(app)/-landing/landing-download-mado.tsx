import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';
import type { PointerEvent } from 'react';

import { cn } from '@repo/ui/cn';

import type {
  LandingClassNameProps,
  LandingDownloadMadoProps,
} from '#/features/landing/landing.type';
import {
  LANDING_APP_HREF,
  LANDING_DOWNLOAD_HREF,
} from '#/features/landing/landing-content';

const LIGHT =
  'linear-gradient(90deg, transparent, color-mix(in oklch, var(--color-accent-fg) 15%, transparent) 25%, color-mix(in oklch, var(--color-accent-fg) 15%, transparent) 75%, transparent)';

/** Every main call to action downloads the desktop app, the main product, with the same button. */
export function DownloadMado({
  label = 'Download for Mac',
  className,
}: LandingDownloadMadoProps) {
  return (
    <a
      href={LANDING_DOWNLOAD_HREF}
      onPointerEnter={followMouse}
      onPointerMove={followMouse}
      className={cn(
        'group relative isolate flex h-10 touch-manipulation items-center gap-2.5 overflow-hidden rounded-lg bg-accent pr-1.5 pl-4 t-l-2 text-accent-fg transition-[scale] duration-150 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40 active:scale-[0.97]',
        className,
      )}
    >
      <WindowLight />
      {label}
      <span className="grid size-7 place-items-center">
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
      </span>
    </a>
  );
}

/** The quiet second choice beside a download: use Mado in the browser without installing. */
export function TryMadoHere({ className }: LandingClassNameProps) {
  return (
    <Link
      to={LANDING_APP_HREF}
      className={cn(
        'flex h-10 touch-manipulation items-center rounded-lg border border-border bg-bg/70 px-4 t-l-2 text-fg backdrop-blur-sm transition-[background-color,scale] duration-150 ease-out outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40 active:scale-[0.97]',
        className,
      )}
    >
      Try it here
    </Link>
  );
}

// *** WindowLight ***
// Two panes of light, like a window on a gallery wall. They rest on the left and slide with the mouse's x position; the long hover transition turns every pointer update into a slow glide.
function WindowLight() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-[6%] -z-10 flex w-3/5 -translate-x-[70%] -skew-x-[18deg] gap-[3px] opacity-0 transition-[translate,opacity] duration-[240ms] ease-out group-hover:translate-x-[calc(var(--light-x,0.5)*60%_-_30%)] group-hover:opacity-100 group-hover:duration-[480ms] group-hover:ease-(--poise-ease-out-expo) motion-reduce:transition-none"
    >
      <span className="w-[62%]" style={{ background: LIGHT }} />
      <span className="w-[26%]" style={{ background: LIGHT }} />
    </span>
  );
}

// *** followMouse ***
function followMouse(e: PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== 'mouse') return;

  const link = e.currentTarget;
  const x = e.clientX - link.getBoundingClientRect().left;
  link.style.setProperty(
    '--light-x',
    String(clamp(x / link.offsetWidth, 0, 1)),
  );
}

// *** clamp ***
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
