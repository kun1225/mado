import type { ComponentProps } from 'react';
import { cn } from './cn';

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-6 w-fit min-w-6 items-center justify-center gap-1 rounded-sm bg-muted px-1.5 t-l-3 text-muted-fg select-none',
        // The tooltip is dark in light mode, so a muted chip would vanish on it.
        'in-data-[slot=tooltip-content]:bg-bg/20 in-data-[slot=tooltip-content]:text-bg',
        '[&_svg:not([class*="size-"])]:size-3',
        className,
      )}
      {...props}
    />
  );
}

export function KbdGroup({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    />
  );
}
