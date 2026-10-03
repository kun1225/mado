import * as cheerio from 'cheerio';

import {
  type FetchedPage,
  safeFetch,
  SafeFetchError,
} from './site-preview-safe-fetch.js';

export type SiteEmbed =
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
  embed: SiteEmbed;
};

export type HtmlMetadata = {
  title: string | null;
  description: string | null;
  favicon: string | null;
  ogImage: string | null;
};

export type FramePolicy =
  { allowed: true } | { allowed: false; reason: 'csp' | 'x-frame-options' };

type Deps = {
  /** Origin of the web app that will show the iframe. */
  appOrigin: string;
  fetchPage?: (url: URL) => Promise<FetchedPage>;
};

/** Errors that mean "this URL is not allowed", not "this site is down". */
const REJECTED_CODES = new Set(['blocked-address', 'unsupported-protocol']);

export async function getSitePreview(
  url: URL,
  { appOrigin, fetchPage = safeFetch }: Deps,
): Promise<SitePreview> {
  const page = await fetchOrNull(url, fetchPage);
  const finalUrl = page?.finalUrl ?? url;
  const metadata =
    page?.html != null ? readHtmlMetadata(page.html, finalUrl) : EMPTY_METADATA;

  return {
    url: url.href,
    finalUrl: finalUrl.href,
    domain: finalUrl.hostname.replace(/^www\./, ''),
    ...metadata,
    embed: chooseEmbed(getProviderEmbed(url), page, appOrigin),
  };
}

const EMPTY_METADATA: HtmlMetadata = {
  title: null,
  description: null,
  favicon: null,
  ogImage: null,
};

async function fetchOrNull(
  url: URL,
  fetchPage: (url: URL) => Promise<FetchedPage>,
): Promise<FetchedPage | null> {
  try {
    return await fetchPage(url);
  } catch (error) {
    if (error instanceof SafeFetchError && !REJECTED_CODES.has(error.code)) {
      return null;
    }
    throw error;
  }
}

function chooseEmbed(
  providerSrc: string | null,
  page: FetchedPage | null,
  appOrigin: string,
): SiteEmbed {
  if (providerSrc) return { mode: 'provider', src: providerSrc };
  if (!page || page.status >= 400)
    return { mode: 'none', reason: 'fetch-failed' };
  if (page.html === null) return { mode: 'none', reason: 'not-html' };

  const policy = getFramePolicy(
    page.headers,
    appOrigin,
    page.finalUrl.protocol,
  );
  return policy.allowed
    ? { mode: 'iframe', src: page.finalUrl.href }
    : { mode: 'none', reason: policy.reason };
}

const MAX_TITLE = 300;
const MAX_DESCRIPTION = 1000;

function cleanText(value: string | undefined, max: number): string | null {
  const text = value?.replace(/\s+/g, ' ').trim().slice(0, max);
  return text ? text : null;
}

/** Resolve against the page URL. Only http(s) results are kept. */
function resolveHttpUrl(value: string | undefined, base: URL): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function readHtmlMetadata(html: string, pageUrl: URL): HtmlMetadata {
  const $ = cheerio.load(html);
  const meta = (selector: string) => $(selector).first().attr('content');

  const faviconHref = $('link[rel~="icon"]').first().attr('href');

  return {
    title: cleanText(
      meta('meta[property="og:title"]') ??
        meta('meta[name="twitter:title"]') ??
        $('title').first().text(),
      MAX_TITLE,
    ),
    description: cleanText(
      meta('meta[property="og:description"]') ??
        meta('meta[name="description"]') ??
        meta('meta[name="twitter:description"]'),
      MAX_DESCRIPTION,
    ),
    favicon:
      resolveHttpUrl(faviconHref, pageUrl) ??
      new URL('/favicon.ico', pageUrl).href,
    ogImage: resolveHttpUrl(
      meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]'),
      pageUrl,
    ),
  };
}

const YOUTUBE_ID = /^[\w-]{11}$/;

function stripWww(hostname: string): string {
  return hostname.replace(/^(www|m)\./, '');
}

function youtube(url: URL): string | null {
  const host = stripWww(url.hostname);
  const [, first, second] = url.pathname.split('/');

  let id: string | null | undefined = null;
  if (host === 'youtu.be') id = first;
  else if (host === 'youtube.com') {
    id =
      first === 'shorts' || first === 'embed'
        ? second
        : url.searchParams.get('v');
  } else return null;

  return id && YOUTUBE_ID.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : null;
}

function vimeo(url: URL): string | null {
  if (stripWww(url.hostname) !== 'vimeo.com') return null;
  const id = /^\/(\d+)\/?$/.exec(url.pathname)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

function spotify(url: URL): string | null {
  if (url.hostname !== 'open.spotify.com') return null;
  const match = /^\/(track|album|playlist|episode|show|artist)\/(\w+)/.exec(
    url.pathname,
  );
  return match
    ? `https://open.spotify.com/embed/${match[1]}/${match[2]}`
    : null;
}

function figma(url: URL): string | null {
  if (stripWww(url.hostname) !== 'figma.com') return null;
  if (!/^\/(file|design|proto|board)\/\w+/.test(url.pathname)) return null;
  return `https://www.figma.com/embed?embed_host=mado&url=${encodeURIComponent(url.href)}`;
}

const PROVIDERS = [youtube, vimeo, spotify, figma];

/** The official embed URL for a known site, or null. No network needed. */
export function getProviderEmbed(url: URL): string | null {
  for (const provider of PROVIDERS) {
    const src = provider(url);
    if (src) return src;
  }
  return null;
}

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

const SCHEME_SOURCE = /^[a-z][a-z0-9+.-]*:$/;
const HOST_SOURCE =
  /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*|\*\.[^:/*]+|[^:/*]+)(?::(\*|\d+))?(?:\/.*)?$/;

/** "http" also matches "https": the spec lets a page upgrade. */
function schemeMatches(sourceScheme: string, origin: URL): boolean {
  const scheme = origin.protocol.slice(0, -1);
  return (
    sourceScheme === scheme || (sourceScheme === 'http' && scheme === 'https')
  );
}

function hostSourceMatches(
  source: string,
  origin: URL,
  pageProtocol: string,
): boolean {
  const match = HOST_SOURCE.exec(source);
  if (!match) return false;
  const [, scheme, host = '', port] = match;

  if (!schemeMatches(scheme ?? pageProtocol.slice(0, -1), origin)) return false;

  const hostMatches =
    host === '*' ||
    (host.startsWith('*.')
      ? origin.hostname.endsWith(host.slice(1))
      : origin.hostname === host);
  if (!hostMatches) return false;

  if (port === '*') return true;
  if (port === undefined) return origin.port === '';
  return (
    origin.port === port ||
    (origin.port === '' && DEFAULT_PORTS[origin.protocol] === port)
  );
}

function sourceMatches(
  source: string,
  origin: URL,
  pageProtocol: string,
): boolean {
  const value = source.toLowerCase();
  if (value === '*') return true;
  if (value.startsWith("'")) return false;
  if (SCHEME_SOURCE.test(value))
    return schemeMatches(value.slice(0, -1), origin);
  return hostSourceMatches(value, origin, pageProtocol);
}

/** The first frame-ancestors source list in one policy, or null if it has none. */
function readFrameAncestors(policy: string): string[] | null {
  for (const directive of policy.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name?.toLowerCase() === 'frame-ancestors') return sources;
  }
  return null;
}

function checkCsp(
  header: string,
  origin: URL,
  pageProtocol: string,
): FramePolicy | null {
  let found = false;
  for (const policy of header.split(',')) {
    const sources = readFrameAncestors(policy);
    if (!sources) continue;
    found = true;
    if (
      !sources.some((source) => sourceMatches(source, origin, pageProtocol))
    ) {
      return { allowed: false, reason: 'csp' };
    }
  }
  return found ? { allowed: true } : null;
}

/**
 * Guess if a browser will show this page inside a frame on `appOrigin`.
 * Our app is always a different site, so SAMEORIGIN blocks us too.
 * `pageProtocol` is the scheme of the page being framed (after redirects).
 * This is a guess: some sites block frames with scripts instead of headers.
 */
export function getFramePolicy(
  headers: Headers,
  appOrigin: string,
  pageProtocol = 'https:',
): FramePolicy {
  const csp = checkCsp(
    headers.get('content-security-policy') ?? '',
    new URL(appOrigin),
    pageProtocol,
  );
  if (csp) return csp;

  const values = (headers.get('x-frame-options') ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase());
  const disagree = new Set(values).size > 1;
  if (
    disagree ||
    values.some((value) => value === 'deny' || value === 'sameorigin')
  ) {
    return { allowed: false, reason: 'x-frame-options' };
  }
  return { allowed: true };
}
