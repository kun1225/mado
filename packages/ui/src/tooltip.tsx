import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from 'cn';

const createTooltipHandle = TooltipPrimitive.createHandle;

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function Tooltip<Payload>({ ...props }: TooltipPrimitive.Root.Props<Payload>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger<Payload>({
  ...props
}: TooltipPrimitive.Trigger.Props<Payload>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

const tooltipPositioner = cn(
  'isolate z-tooltip h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)',
  'transition-[top,right,bottom,left] duration-middle ease-out-quint data-instant:transition-none',
);

const tooltipPopup = cn(
  'relative h-(--popup-height,auto) w-(--popup-width,auto) max-w-xs origin-(--transform-origin) rounded-md bg-fg text-xs whitespace-nowrap text-bg',
  'transition-[width,height,opacity,scale] duration-middle ease-out-quint data-instant:transition-none',
  'data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0',
);

const tooltipViewport = cn(
  '[--viewport-inline-padding:--spacing(3)]',
  'relative flex h-full w-full items-center gap-1.5 overflow-clip px-(--viewport-inline-padding) py-1.5',
  'has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-tooltip **:data-[slot=kbd]:rounded-sm',

  '**:data-current:w-max **:data-current:translate-x-0 **:data-current:whitespace-nowrap **:data-current:opacity-100 **:data-current:transition-[translate,opacity] **:data-current:duration-middle **:data-current:ease-out-quint',
  '**:data-previous:w-max **:data-previous:translate-x-0 **:data-previous:whitespace-nowrap **:data-previous:opacity-100 **:data-previous:transition-[translate,opacity] **:data-previous:duration-middle **:data-previous:ease-out-quint',

  "data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:translate-x-[-200%] data-[activation-direction~='left']:[&_[data-current][data-starting-style]]:opacity-0",
  "data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:translate-x-[200%] data-[activation-direction~='right']:[&_[data-current][data-starting-style]]:opacity-0",
  "data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:translate-x-[200%] data-[activation-direction~='left']:[&_[data-previous][data-ending-style]]:opacity-0",
  "data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:translate-x-[-200%] data-[activation-direction~='right']:[&_[data-previous][data-ending-style]]:opacity-0",

  '[[data-instant]_&_[data-current]]:transition-none [[data-instant]_&_[data-previous]]:transition-none',
);

const tooltipArrow = cn(
  'z-tooltip size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-fg fill-fg',
  'transition-[left] duration-middle ease-out-quint data-instant:transition-none',
  'data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5',
);

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className={tooltipPositioner}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(tooltipPopup, className)}
          {...props}
        >
          <TooltipPrimitive.Arrow className={tooltipArrow} />

          <TooltipPrimitive.Viewport className={tooltipViewport}>
            {children}
          </TooltipPrimitive.Viewport>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export {
  createTooltipHandle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
};
