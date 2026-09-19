'use client';

import { AlertDialog as Primitive } from '@base-ui/react/alert-dialog';
import { cn } from 'cn';
import * as React from 'react';

import { Button } from './button';

function AlertDialog(props: Primitive.Root.Props) {
  return <Primitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: Primitive.Trigger.Props) {
  return <Primitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: Primitive.Backdrop.Props) {
  return (
    <Primitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        'fixed inset-0 z-modal-overlay bg-black/20 supports-backdrop-filter:backdrop-blur-xs',
        'data-open:animate-in data-open:duration-slow data-open:ease-out data-open:fade-in-0',
        'data-closed:animate-out data-closed:duration-fast data-closed:ease-standard data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({ className, ...props }: Primitive.Popup.Props) {
  return (
    <Primitive.Portal>
      <AlertDialogOverlay />
      <Primitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          'z-modal rounded-lg border border-border bg-bg p-6 text-fg shadow-lg outline-none',
          'fixed top-1/2 left-1/2 grid w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-6',
          'data-open:animate-in data-open:duration-slow data-open:ease-out-back data-open:fade-in-0 data-open:blur-in-xs',
          'data-closed:animate-out data-closed:ease-standard data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:blur-out-xs data-open:zoom-in-85',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: Primitive.Title.Props) {
  return (
    <Primitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-base font-semibold', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: Primitive.Description.Props) {
  return (
    <Primitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-sm text-pretty text-muted-fg', className)}
      {...props}
    />
  );
}

function AlertDialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({
  variant = 'outline',
  size = 'default',
  ...props
}: Primitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <Primitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogTrigger,
};
