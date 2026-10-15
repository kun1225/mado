export type SitePreviewEmbed =
  | { mode: 'provider'; src: string }
  | { mode: 'iframe'; src: string }
  | {
      mode: 'none';
      reason: 'x-frame-options' | 'csp' | 'not-html' | 'fetch-failed';
    };

export type SitePreview = {
  url: string;
  finalUrl: string;
  domain: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  ogImage: string | null;
  embed: SitePreviewEmbed;
  /** For sites like X that block embedding but share the video file. */
  video: SitePreviewVideo | null;
};

export type SitePreviewVideo = {
  url: string;
  title: string;
};

export type SitePreviewHtmlMetadata = {
  title: string | null;
  description: string | null;
  favicon: string | null;
  ogImage: string | null;
};

export type SitePreviewImage = {
  type: string;
  body: Buffer;
};

export type SitePreviewFramePolicy =
  { allowed: true } | { allowed: false; reason: 'csp' | 'x-frame-options' };

export type SitePreviewFetchedPage = {
  finalUrl: URL;
  status: number;
  headers: Headers;
  html: string | null;
};

export type SitePreviewSafeFetchOptions = {
  timeoutMs?: number;
  /** Only tests use this, to reach a local server. */
  allowPrivateAddresses?: boolean;
};

export type SitePreviewSafeFetchErrorCode =
  | 'blocked-address'
  | 'too-many-redirects'
  | 'unsupported-protocol'
  | 'timeout'
  | 'request-failed';

export type SitePreviewDependencies = {
  appOrigin: string;
  fetchPage?: (url: URL) => Promise<SitePreviewFetchedPage>;
  fetchVideo?: (url: URL) => Promise<SitePreviewVideo | null>;
};

export type SitePreviewXPostDependencies = {
  fetchJson: (url: URL) => Promise<unknown>;
};
