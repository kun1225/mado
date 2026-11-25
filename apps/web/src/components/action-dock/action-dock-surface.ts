import { cn } from '@repo/ui/cn';

// Its own file, so the landing page can draw the dock's search without loading the dock's data hooks.
export const FLOATING_SURFACE = cn(
  'border border-border bg-bg/80 shadow-md backdrop-blur-xl',
);

export const FLOATING_BAR = cn(
  FLOATING_SURFACE,
  'flex h-12 items-center gap-1 rounded-full pr-1.5 pl-4',
);
