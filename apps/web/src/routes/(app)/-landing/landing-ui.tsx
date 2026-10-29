import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '@repo/ui/cn';

import type { LandingTile } from '#/features/landing/landing.type';
import { LANDING_APP_HREF } from '#/features/landing/landing-content';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

export const LANDING_H2 = 't-h-2 text-balance';

/** The one or two serif words a title may have. */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <em className="font-accent font-bold tracking-[-0.01em]">{children}</em>
  );
}

/** Every call to action on the page looks like the header's, so the page has one button. */
export function OpenMado({
  label = 'Open Mado',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Link
      to={LANDING_APP_HREF}
      className={cn(
        'flex h-10 items-center gap-2.5 rounded-lg bg-accent pr-1.5 pl-4 t-l-2 text-accent-fg transition-[background-color,scale] duration-150 ease-out outline-none hover:bg-accent/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/40 active:scale-[0.97]',
        className,
      )}
    >
      {label}
      <span className="grid size-7 place-items-center rounded-sm border border-accent-fg/25">
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
      </span>
    </Link>
  );
}

/** A saved source as it looks in the library: the media, rounded, at its own aspect ratio. */
export function TileMedia({
  tile,
  loading = 'lazy',
  className,
}: {
  tile: LandingTile;
  loading?: 'lazy' | 'eager';
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const classes = cn(
    'block size-full rounded-md bg-muted object-cover select-none',
    className,
  );

  if (tile.kind === 'video') {
    // Muted and inline, or browsers won't autoplay it. Still with reduced motion.
    return (
      <video
        src={tile.src}
        muted
        loop
        playsInline
        autoPlay={!prefersReducedMotion}
        preload="metadata"
        aria-hidden
        className={classes}
      />
    );
  }

  return (
    <img
      src={tile.src}
      alt=""
      draggable={false}
      loading={loading}
      decoding="async"
      className={classes}
    />
  );
}

/** The Focus Frame mark: the only place the hairline-to-heavy frame is used. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="48 48 160 160"
      aria-hidden
      className={cn('size-3.5 fill-current', className)}
    >
      <path
        fillRule="evenodd"
        d="M88 48H168A40 40 0 0 1 208 88V168A40 40 0 0 1 168 208H88A40 40 0 0 1 48 168V88A40 40 0 0 1 88 48Z M88 52H156A34 34 0 0 1 190 86V154A34 34 0 0 1 156 188H88A36 36 0 0 1 52 152V88A36 36 0 0 1 88 52Z"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 t-h-7">
      <Logo />
      <span className="font-accent">Mado</span>
    </Link>
  );
}
