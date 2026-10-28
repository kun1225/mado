'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from './cn';

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-accent data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:bg-border motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-bg shadow-sm transition-transform duration-200 ease-out data-checked:translate-x-4 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
