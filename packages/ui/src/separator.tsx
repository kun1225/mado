'use client'

import { Separator as Primitive } from '@base-ui/react/separator'
import { cn } from 'cn'
import type { ComponentProps } from 'react'

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<typeof Primitive>) {
  return (
    <Primitive
      orientation={orientation}
      className={cn(
        'before:bg-border relative shrink-0 before:absolute before:inset-0 before:rounded-full',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
