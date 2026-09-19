'use client';

import { type Button as ButtonPrimitive } from '@base-ui/react/button';
import {
  CheckmarkCircle01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import * as React from 'react';

import { Button, buttonVariants } from './button';

const ASYNC_BUTTON_SUCCESS_RESET_DELAY_MS = 1000;

type AsyncButtonState = 'idle' | 'loading' | 'success';

type AsyncButtonClickEvent = Parameters<
  NonNullable<ButtonPrimitive.Props['onClick']>
>[0];

type AsyncButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> &
  (
    | {
        /** Uncontrolled: the button tracks the promise itself. */
        state?: never;
        onAsyncClick: () => Promise<void>;
        /** Go back to idle a moment after success. */
        resetAfterSuccess?: boolean;
      }
    | {
        /** Controlled: the parent owns the state. */
        state: AsyncButtonState;
        onAsyncClick?: never;
        resetAfterSuccess?: never;
      }
  );

function AsyncButton({
  state,
  onAsyncClick,
  resetAfterSuccess = false,
  children,
  className,
  disabled,
  onClick,
  ...props
}: AsyncButtonProps) {
  const resetTimeoutRef = React.useRef<number | null>(null);
  const [internalState, setInternalState] =
    React.useState<AsyncButtonState>('idle');

  const currentState = state ?? internalState;
  const isIdle = currentState === 'idle';
  const isLoading = currentState === 'loading';
  const isSuccess = currentState === 'success';

  React.useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function handleClick(event: AsyncButtonClickEvent) {
    onClick?.(event);

    if (event.defaultPrevented || !onAsyncClick || isLoading) {
      return;
    }

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    try {
      setInternalState('loading');
      await onAsyncClick();
      setInternalState('success');

      if (resetAfterSuccess) {
        // Keep success visible briefly so the state change is readable.
        resetTimeoutRef.current = window.setTimeout(() => {
          setInternalState('idle');
          resetTimeoutRef.current = null;
        }, ASYNC_BUTTON_SUCCESS_RESET_DELAY_MS);
      }
    } catch (error) {
      console.error('AsyncButton: onAsyncClick rejected', error);
      setInternalState('idle');
    }
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'relative grid overflow-hidden',
        (disabled || isLoading || isSuccess) && 'pointer-events-none',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative col-[1/2] row-[1/2] h-full w-full transition-[transform,opacity,translate] duration-200',
          isIdle && '-translate-y-full opacity-0 ease-in',
          !isIdle && 'translate-y-0 opacity-100 delay-100 ease-out',
        )}
      >
        <span className="absolute inset-0 grid place-content-center">
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className={cn(
              'col-[1/2] row-[1/2] animate-spin transition-[transform,opacity,scale] duration-200',
              isSuccess && 'scale-80 opacity-0 ease-in',
              !isSuccess && 'scale-100 opacity-100 ease-out',
            )}
          />

          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            strokeWidth={2}
            className={cn(
              'col-[1/2] row-[1/2] transition-[transform,opacity,scale] duration-200',
              isSuccess && 'scale-100 opacity-100 ease-out',
              !isSuccess && 'scale-80 opacity-0 ease-in',
            )}
          />
        </span>
      </span>

      <span
        className={cn(
          'col-[1/2] row-[1/2] grid h-full place-items-center transition-[transform,opacity,translate] duration-200',
          isIdle && 'opacity-100 delay-100 ease-out',
          !isIdle && 'translate-y-full opacity-0 ease-in',
        )}
      >
        {children}
      </span>
    </Button>
  );
}

export { ASYNC_BUTTON_SUCCESS_RESET_DELAY_MS, AsyncButton };
export type { AsyncButtonProps, AsyncButtonState };
