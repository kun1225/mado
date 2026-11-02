import type { ReactNode } from 'react';

import type { DesktopFolderStatus } from './desktop-bridge.type';

export type DesktopLibraryGateProps = {
  children: ReactNode;
};

export type DesktopFolderPromptProps = {
  /** Why the prompt shows: no folder yet, or the saved one is gone. */
  folder: DesktopFolderStatus;
  choosing: boolean;
  onChoose: () => void;
  onRetry: () => void;
};
