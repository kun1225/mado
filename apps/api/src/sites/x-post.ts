import { z } from 'zod';

import type {
  SitePreviewVideo,
  SitePreviewXPostDependencies,
} from './site-preview-type.js';

/**
 * x.com forbids framing, but the syndication API behind its official embeds
 * shares the post's mp4 files. It is undocumented, so any surprise means "no video".
 */
export async function getXPostVideo(
  url: URL,
  { fetchJson }: SitePreviewXPostDependencies,
): Promise<SitePreviewVideo | null> {
  const id = getXPostId(url);
  if (!id) return null;

  const post = syndicationPostSchema.safeParse(
    await fetchJson(getSyndicationUrl(id)),
  );
  if (!post.success) return null;

  const media = post.data.mediaDetails?.find(
    (item) => item.type === 'video' || item.type === 'animated_gif',
  );
  const videoUrl = pickBestMp4(media?.video_info?.variants ?? []);
  return videoUrl ? { url: videoUrl, title: getPostTitle(post.data) } : null;
}

const X_HOSTS = new Set(['x.com', 'twitter.com']);

// *** getXPostId ***
export function getXPostId(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m|mobile)\./, '');
  if (!X_HOSTS.has(host)) return null;
  return /^\/(?:\w+|i\/web)\/status\/(\d+)/.exec(url.pathname)?.[1] ?? null;
}

const syndicationPostSchema = z.object({
  text: z.string().default(''),
  user: z.object({ screen_name: z.string() }),
  mediaDetails: z
    .array(
      z.object({
        type: z.string(),
        video_info: z
          .object({
            variants: z.array(
              z.object({
                content_type: z.string(),
                bitrate: z.number().optional(),
                url: z.string(),
              }),
            ),
          })
          .optional(),
      }),
    )
    .optional(),
});

type SyndicationPost = z.infer<typeof syndicationPostSchema>;
type SyndicationVariant = NonNullable<
  NonNullable<SyndicationPost['mediaDetails']>[number]['video_info']
>['variants'][number];

// *** getSyndicationUrl ***
/** The token is not a secret: it is the same math react-tweet and widgets.js use. */
function getSyndicationUrl(id: string): URL {
  const token = ((Number(id) / 1e15) * Math.PI)
    .toString(36)
    .replace(/(0+|\.)/g, '');
  const url = new URL('https://cdn.syndication.twimg.com/tweet-result');
  url.searchParams.set('id', id);
  url.searchParams.set('token', token);
  return url;
}

// *** pickBestMp4 ***
function pickBestMp4(variants: SyndicationVariant[]): string | null {
  const [best] = variants
    .filter((variant) => variant.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return best?.url ?? null;
}

// *** getPostTitle ***
/** X appends t.co links for the attached media; they are noise in a title. */
function getPostTitle(post: SyndicationPost): string {
  const text = post.text.replace(/(\s*https:\/\/t\.co\/\w+)+\s*$/, '').trim();
  return text || `@${post.user.screen_name}`;
}
