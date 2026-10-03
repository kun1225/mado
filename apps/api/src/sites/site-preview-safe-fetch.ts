import dns from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { Readable } from 'node:stream';
import zlib from 'node:zlib';

export type FetchedPage = {
  /** The URL after redirects. */
  finalUrl: URL;
  status: number;
  headers: Headers;
  /** Null when the response is not html. */
  html: string | null;
};

export type SafeFetchOptions = {
  timeoutMs?: number;
  /** Only for tests that talk to a local server. */
  allowPrivateAddresses?: boolean;
};

export type SafeFetchErrorCode =
  | 'blocked-address'
  | 'too-many-redirects'
  | 'unsupported-protocol'
  | 'timeout'
  | 'request-failed';

export class SafeFetchError extends Error {
  constructor(
    readonly code: SafeFetchErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SafeFetchError';
  }
}

const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

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

/** True for loopback, local network, link-local, reserved and unparsable addresses. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return family === 4
    ? privateRanges.check(address, 'ipv4')
    : isPrivateIpv6(address);
}

/**
 * Resolves the host name and refuses private addresses. The connection uses
 * the address we checked, so a second DNS answer cannot swap it afterwards.
 */
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

function request(
  url: URL,
  signal: AbortSignal,
  allowPrivate: boolean,
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
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-language': 'en',
          'accept-encoding': 'gzip, deflate, br',
        },
      },
      resolve,
    );
    req.on('error', reject);
    req.end();
  });
}

function toHeaders(raw: IncomingMessage['headers']): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) headers.append(name, item);
    }
  }
  return headers;
}

const DECODERS: Record<
  string,
  () => zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress
> = {
  gzip: zlib.createGunzip,
  deflate: zlib.createInflate,
  br: zlib.createBrotliDecompress,
};

function isHtml(contentType: string | null): boolean {
  return /^(text\/html|application\/xhtml\+xml)\b/i.test(contentType ?? '');
}

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

/**
 * Fetch a page the user typed in. Blocks private addresses on every redirect,
 * and limits time, redirects and body size.
 */
export async function safeFetch(
  startUrl: URL,
  {
    timeoutMs = TIMEOUT_MS,
    allowPrivateAddresses = false,
  }: SafeFetchOptions = {},
): Promise<FetchedPage> {
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

      const res = await request(url, signal, allowPrivateAddresses);
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

      const html = isHtml(headers.get('content-type'))
        ? await readText(res, headers)
        : null;
      if (html === null) res.destroy();
      return { finalUrl: url, status, headers, html };
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
