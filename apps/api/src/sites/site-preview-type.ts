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
  /** The post's first video, for sites that block embedding but share their files (X). */
  video: SitePreviewVideo | null;
};

export type SitePreviewVideo = {
  /** A direct mp4 URL. */
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
  /** A MIME type such as `image/png`. */
  type: string;
  body: Buffer;
};

export type SitePreviewFramePolicy =
  { allowed: true } | { allowed: false; reason: 'csp' | 'x-frame-options' };

export type SitePreviewFetchedPage = {
  /** The URL after redirects. */
  finalUrl: URL;
  status: number;
  headers: Headers;
  /** Null when the response is not html. */
  html: string | null;
};

export type SitePreviewSafeFetchOptions = {
  timeoutMs?: number;
  /** Only for tests that talk to a local server. */
  allowPrivateAddresses?: boolean;
};

export type SitePreviewSafeFetchErrorCode =
  | 'blocked-address'
  | 'too-many-redirects'
  | 'unsupported-protocol'
  | 'timeout'
  | 'request-failed';

export type SitePreviewDependencies = {
  /** Origin of the web app that will show the iframe. */
  appOrigin: string;
  fetchPage?: (url: URL) => Promise<SitePreviewFetchedPage>;
  fetchVideo?: (url: URL) => Promise<SitePreviewVideo | null>;
};

export type SitePreviewXPostDependencies = {
  fetchJson: (url: URL) => Promise<unknown>;
};
