'use client';

import { Dialog as Primitive } from '@base-ui/react/dialog';
import { cn } from 'cn';

function Dialog(props: Primitive.Root.Props) {
  return <Primitive.Root data-slot="dialog" {...props} />;
}

function DialogOverlay({ className, ...props }: Primitive.Backdrop.Props) {
  return (
    <Primitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-modal-overlay bg-black/70 supports-backdrop-filter:backdrop-blur-xl',
        'data-open:animate-in data-open:duration-slow data-open:ease-out data-open:fade-in-0',
        'data-closed:animate-out data-closed:duration-fast data-closed:ease-standard data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

/** Full-screen surface: the caller lays out what goes inside. */
function DialogContent({
  className,
  onBackdropClick,
  ...props
}: Primitive.Popup.Props & { onBackdropClick?: () => void }) {
  return (
    <Primitive.Portal>
      <DialogOverlay onClick={onBackdropClick} />
      <Primitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed inset-0 z-modal text-bg outline-none',
          onBackdropClick && 'pointer-events-none',
          'data-open:animate-in data-open:duration-slow data-open:ease-out data-open:fade-in-0',
          'data-closed:animate-out data-closed:duration-fast data-closed:ease-standard data-closed:fade-out-0',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

function DialogTitle({ className, ...props }: Primitive.Title.Props) {
  return (
    <Primitive.Title
      data-slot="dialog-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  );
}

function DialogClose(props: Primitive.Close.Props) {
  return <Primitive.Close data-slot="dialog-close" {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogOverlay, DialogTitle };
