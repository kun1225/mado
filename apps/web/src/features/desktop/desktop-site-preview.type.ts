export type DesktopSitePreviewProps = {
  url: string;
  name: string;
  thumbnailUrl: string | null;
  active: boolean;
  mediaRef: (element: HTMLElement | null) => void;
};
