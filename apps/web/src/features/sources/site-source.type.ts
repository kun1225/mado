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
  url: string;
  title: string;
};

export type SiteSourceInput = {
  /** Made before the preview loads, so the pending card and the real card share one grid slot. */
  id: string;
  collectionId: string | null;
  url: string;
};

/** A website still loading its preview, shown as a card until the real source lands. */
export type SitePendingSource = {
  id: string;
  kind: 'pending-site';
  domain: string;
};
