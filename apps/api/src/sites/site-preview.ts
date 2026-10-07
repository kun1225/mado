import * as cheerio from 'cheerio';
import dns from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { Readable } from 'node:stream';
import zlib from 'node:zlib';
import type {
  SitePreview,
  SitePreviewDependencies,
  SitePreviewEmbed,
  SitePreviewFetchedPage,
  SitePreviewFramePolicy,
  SitePreviewHtmlMetadata,
  SitePreviewImage,
  SitePreviewSafeFetchErrorCode,
  SitePreviewSafeFetchOptions,
} from './site-preview-type.js';

export class SafeFetchError extends Error {
  constructor(
    readonly code: SitePreviewSafeFetchErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SafeFetchError';
  }
}

/** Errors that mean "this URL is not allowed", not "this site is down". */
const REJECTED_CODES = new Set(['blocked-address', 'unsupported-protocol']);

// *** isRejectedUrlError ***
export function isRejectedUrlError(error: unknown): boolean {
  return error instanceof SafeFetchError && REJECTED_CODES.has(error.code);
}

export async function getSitePreview(
  url: URL,
  { appOrigin, fetchPage = safeFetch }: SitePreviewDependencies,
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

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// *** safeFetch ***
export async function safeFetch(
  startUrl: URL,
  options: SitePreviewSafeFetchOptions = {},
): Promise<SitePreviewFetchedPage> {
  const { res, finalUrl, status, headers } = await followRedirects(
    startUrl,
    options,
  );

  const html = isHtml(headers.get('content-type'))
    ? await readText(res, headers)
    : null;
  if (html === null) res.destroy();
  return { finalUrl, status, headers, html };
}

// *** fetchSiteImage ***
/** Downloads an image from a site, for the browser, which cannot do it because of CORS. */
export async function fetchSiteImage(
  startUrl: URL,
  options: SitePreviewSafeFetchOptions = {},
): Promise<SitePreviewImage> {
  const { res, status, headers } = await followRedirects(startUrl, options, {
    accept: 'image/*',
    acceptEncoding: 'identity',
  });

  const type = (headers.get('content-type') ?? '').split(';')[0]!.trim();
  const isUsable =
    status >= 200 &&
    status < 300 &&
    IMAGE_TYPES.has(type.toLowerCase()) &&
    !headers.has('content-encoding');
  if (!isUsable) {
    res.destroy();
    throw new Error('Not a usable image');
  }

  return { type: type.toLowerCase(), body: await readBytes(res) };
}

// *** followRedirects ***
/** Sends the request and follows redirects. Every hop passes the address check. */
async function followRedirects(
  startUrl: URL,
  {
    timeoutMs = TIMEOUT_MS,
    allowPrivateAddresses = false,
  }: SitePreviewSafeFetchOptions,
  requestHeaders: RequestHeaders = {},
): Promise<{
  res: IncomingMessage;
  finalUrl: URL;
  status: number;
  headers: Headers;
}> {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = startUrl;

  try {
    for (let redirects = 0; ; redirects++) {
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new SafeFetchError(
          'unsupported-protocol',
          `Cannot fetch ${url.protocol}`,
        );
      }

      const res = await request(
        url,
        signal,
        allowPrivateAddresses,
        requestHeaders,
      );
      const status = res.statusCode ?? 0;
      const headers = toHeaders(res.headers);

      const location = headers.get('location');
      if (REDIRECT_STATUSES.has(status) && location) {
        res.destroy();
        if (redirects >= MAX_REDIRECTS) {
          throw new SafeFetchError('too-many-redirects', 'Too many redirects');
        }
        url = new URL(location, url);
        continue;
      }

      return { res, finalUrl: url, status, headers };
    }
  } catch (error) {
    if (error instanceof SafeFetchError) throw error;
    if (signal.aborted)
      throw new SafeFetchError('timeout', 'Request timed out', {
        cause: error,
      });
    throw new SafeFetchError('request-failed', 'Request failed', {
      cause: error,
    });
  }
}

type RequestHeaders = { accept?: string; acceptEncoding?: string };

// *** request ***
function request(
  url: URL,
  signal: AbortSignal,
  allowPrivate: boolean,
  {
    accept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    acceptEncoding = 'gzip, deflate, br',
  }: RequestHeaders,
): Promise<IncomingMessage> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!allowPrivate && isIP(host) && isPrivateAddress(host)) {
    return Promise.reject(
      new SafeFetchError('blocked-address', `${host} is not a public address`),
    );
  }

  const transport = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: 'GET',
        signal,
        // A new connection every time: a reused one would skip the address check.
        agent: false,
        // Node's lookup type is wider than what we need.
        lookup: createGuardedLookup(allowPrivate) as never,
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; MadoBot/1.0)',
          accept,
          'accept-language': 'en',
          'accept-encoding': acceptEncoding,
        },
      },
      resolve,
    );
    req.on('error', reject);
    req.end();
  });
}

// *** createGuardedLookup ***
function createGuardedLookup(allowPrivate: boolean) {
  return (
    hostname: string,
    options: { all?: boolean },
    callback: (error: Error | null, address: unknown, family?: number) => void,
  ) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
      if (error) return callback(error, '', 0);
      if (!allowPrivate && addresses.some((a) => isPrivateAddress(a.address))) {
        return callback(
          new SafeFetchError(
            'blocked-address',
            `${hostname} is not a public address`,
          ),
          '',
          0,
        );
      }
      const [first] = addresses;
      if (!first)
        return callback(new Error(`No address for ${hostname}`), '', 0);
      return options.all
        ? callback(null, addresses)
        : callback(null, first.address, first.family);
    });
  };
}

const privateRanges = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  privateRanges.addSubnet(address, prefix, 'ipv4');
}
// Teredo and 6to4 sit inside the public IPv6 range but carry a hidden IPv4 address.
for (const [address, prefix] of [
  ['2001::', 32],
  ['2002::', 16],
] as const) {
  privateRanges.addSubnet(address, prefix, 'ipv6');
}

// *** isPrivateAddress ***
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return family === 4
    ? privateRanges.check(address, 'ipv4')
    : isPrivateIpv6(address);
}

// *** isPrivateIpv6 ***
/**
 * Only 2000::/3 (global unicast) is public. Everything else is blocked: that
 * covers loopback, local ranges, NAT64 (64:ff9b::/96) and IPv4-mapped forms.
 * (BlockList cannot say "outside 2000::/3": it maps IPv4 into ::ffff:0:0/96.)
 */
function isPrivateIpv6(address: string): boolean {
  const firstGroup = Number.parseInt(address.split(':')[0] ?? '', 16);
  if (Number.isNaN(firstGroup) || (firstGroup & 0xe000) !== 0x2000) return true;
  return privateRanges.check(address, 'ipv6');
}

// *** toHeaders ***
function toHeaders(raw: IncomingMessage['headers']): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) headers.append(name, item);
    }
  }
  return headers;
}

// *** isHtml ***
function isHtml(contentType: string | null): boolean {
  return /^(text\/html|application\/xhtml\+xml)\b/i.test(contentType ?? '');
}

const DECODERS: Record<
  string,
  () => zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress
> = {
  gzip: zlib.createGunzip,
  deflate: zlib.createInflate,
  br: zlib.createBrotliDecompress,
};

// *** readText ***
/** Reads up to MAX_BODY_BYTES. If the stream breaks half way, keeps what it has. */
async function readText(
  res: IncomingMessage,
  headers: Headers,
): Promise<string> {
  const decoder =
    DECODERS[headers.get('content-encoding')?.trim().toLowerCase() ?? '']?.();
  let source: Readable = res;
  if (decoder) {
    res.on('error', (error) => decoder.destroy(error));
    source = res.pipe(decoder);
  }

  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of source) {
      chunks.push(chunk as Buffer);
      size += (chunk as Buffer).length;
      if (size >= MAX_BODY_BYTES) break;
    }
  } catch {
    // A broken body still leaves us the headers and the part we read.
  } finally {
    res.destroy();
  }

  const charset = /charset=["']?([\w-]+)/i.exec(
    headers.get('content-type') ?? '',
  )?.[1];
  let decoderLabel = 'utf-8';
  try {
    decoderLabel = new TextDecoder(charset).encoding;
  } catch {
    // Unknown charset label: use utf-8.
  }
  return new TextDecoder(decoderLabel).decode(Buffer.concat(chunks));
}

// *** readBytes ***
/** Reads a whole body, and fails when it is over MAX_IMAGE_BYTES. */
async function readBytes(res: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;

  try {
    for await (const chunk of res) {
      size += (chunk as Buffer).length;
      if (size > MAX_IMAGE_BYTES) throw new Error('Image is too large');
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  } finally {
    res.destroy();
  }
}

const EMPTY_METADATA: SitePreviewHtmlMetadata = {
  title: null,
  description: null,
  favicon: null,
  ogImage: null,
};

// *** fetchOrNull ***
async function fetchOrNull(
  url: URL,
  fetchPage: (url: URL) => Promise<SitePreviewFetchedPage>,
): Promise<SitePreviewFetchedPage | null> {
  try {
    return await fetchPage(url);
  } catch (error) {
    if (error instanceof SafeFetchError && !REJECTED_CODES.has(error.code)) {
      return null;
    }
    throw error;
  }
}

// *** readHtmlMetadata ***
export function readHtmlMetadata(
  html: string,
  pageUrl: URL,
): SitePreviewHtmlMetadata {
  const MAX_TITLE = 300;
  const MAX_DESCRIPTION = 1000;

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

// *** cleanText ***
function cleanText(value: string | undefined, max: number): string | null {
  const text = value?.replace(/\s+/g, ' ').trim().slice(0, max);
  return text ? text : null;
}

// *** resolveHttpUrl ***
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

// *** getProviderEmbed ***
/** The official embed URL for a known site, or null. No network needed. */
export function getProviderEmbed(url: URL): string | null {
  for (const provider of PROVIDERS) {
    const src = provider(url);
    if (src) return src;
  }
  return null;
}

const YOUTUBE_ID = /^[\w-]{11}$/;

// *** stripWww ***
function stripWww(hostname: string): string {
  return hostname.replace(/^(www|m)\./, '');
}

// *** youtube ***
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

// *** vimeo ***
function vimeo(url: URL): string | null {
  if (stripWww(url.hostname) !== 'vimeo.com') return null;
  const id = /^\/(\d+)\/?$/.exec(url.pathname)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}

// *** spotify ***
function spotify(url: URL): string | null {
  if (url.hostname !== 'open.spotify.com') return null;
  const match = /^\/(track|album|playlist|episode|show|artist)\/(\w+)/.exec(
    url.pathname,
  );
  return match
    ? `https://open.spotify.com/embed/${match[1]}/${match[2]}`
    : null;
}

// *** figma ***
function figma(url: URL): string | null {
  if (stripWww(url.hostname) !== 'figma.com') return null;
  if (!/^\/(file|design|proto|board)\/\w+/.test(url.pathname)) return null;
  return `https://www.figma.com/embed?embed_host=mado&url=${encodeURIComponent(url.href)}`;
}

const PROVIDERS = [youtube, vimeo, spotify, figma];

// *** chooseEmbed ***
function chooseEmbed(
  providerSrc: string | null,
  page: SitePreviewFetchedPage | null,
  appOrigin: string,
): SitePreviewEmbed {
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

const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

const SCHEME_SOURCE = /^[a-z][a-z0-9+.-]*:$/;
const HOST_SOURCE =
  /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*|\*\.[^:/*]+|[^:/*]+)(?::(\*|\d+))?(?:\/.*)?$/;

// *** getFramePolicy ***
export function getFramePolicy(
  headers: Headers,
  appOrigin: string,
  pageProtocol = 'https:',
): SitePreviewFramePolicy {
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

// *** checkCsp ***
function checkCsp(
  header: string,
  origin: URL,
  pageProtocol: string,
): SitePreviewFramePolicy | null {
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

// *** readFrameAncestors ***
/** The first frame-ancestors source list in one policy, or null if it has none. */
function readFrameAncestors(policy: string): string[] | null {
  for (const directive of policy.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name?.toLowerCase() === 'frame-ancestors') return sources;
  }
  return null;
}

// *** sourceMatches ***
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

// *** schemeMatches ***
/** "http" also matches "https": the spec lets a page upgrade. */
function schemeMatches(sourceScheme: string, origin: URL): boolean {
  const scheme = origin.protocol.slice(0, -1);
  return (
    sourceScheme === scheme || (sourceScheme === 'http' && scheme === 'https')
  );
}

// *** hostSourceMatches ***
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
