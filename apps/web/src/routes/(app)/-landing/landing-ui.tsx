import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { buttonVariants } from '@repo/ui/button';
import { cn } from '@repo/ui/cn';

import type { LandingTile } from '#/features/landing/landing.type';
import { LANDING_APP_HREF } from '#/features/landing/landing-content';
import { usePrefersReducedMotion } from '#/hooks/use-prefers-reduced-motion';

export const LANDING_H2 = 't-h-2 text-balance';

/** The one or two serif words a title may have. */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <em className="font-accent font-semibold tracking-[-0.01em] italic">
      {children}
    </em>
  );
}

export function OpenMado({
  size = 'lg',
  label = 'Open Mado',
  className,
}: {
  size?: 'lg' | 'sm';
  label?: string;
  className?: string;
}) {
  return (
    <Link
      to={LANDING_APP_HREF}
      className={cn(
        buttonVariants({ size: size === 'sm' ? 'sm' : 'default' }),
        'active:translate-y-0 active:scale-[0.97]',
        size === 'lg' && 'h-11 px-5 t-l-1',
        className,
      )}
    >
      {label}
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
      className={cn('size-5 fill-current', className)}
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
    <Link to="/" className="flex items-center gap-2 t-l-1">
      <Logo />
      Mado
    </Link>
  );
}
