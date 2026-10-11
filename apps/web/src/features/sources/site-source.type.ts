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
  /** Missing on previews saved before the API sent it. */
  video?: SiteSourceVideo | null;
};

export type SiteSourceVideo = {
  /** A direct mp4 URL. */
  url: string;
  title: string;
};

export type SiteSourceInput = {
  collectionId: string | null;
  url: string;
};
