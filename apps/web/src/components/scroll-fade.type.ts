import type { ReactNode } from 'react';

export type ScrollFadeProps = {
  className?: string;
  /** Lays out the children. It is as wide as its content so the row can scroll. */
  contentClassName?: string;
  children: ReactNode;
};
