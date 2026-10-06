export type SiteSourcePreview = {
  url: string;
  finalUrl: string;
  domain: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  ogImage: string | null;
  embed:
    | { mode: 'provider' | 'iframe'; src: string }
    | { mode: 'none'; reason: string };
};

export type SiteSourceMetadata = SiteSourcePreview & {
  captureStatus: 'ready' | 'failed';
};

export type SiteSourceInput = {
  collectionId: string | null;
  url: string;
};
