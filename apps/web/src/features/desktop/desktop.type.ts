import type { ReactNode } from 'react';

import type { DesktopFolderStatus } from './desktop-bridge.type';

export type DesktopLibraryGateProps = {
  children: ReactNode;
};

export type DesktopFolderPromptProps = {
  /** Why the prompt shows: no folder yet, the saved one is gone, or it can't be opened. */
  folder: DesktopFolderStatus;
  choosing: boolean;
  onChoose: () => void;
  onRecreate: () => void;
  onRetry: () => void;
};

export type DesktopSitePreviewProps = {
  url: string;
  name: string;
  thumbnailUrl: string | null;
  active: boolean;
  mediaRef: (element: HTMLElement | null) => void;
};
