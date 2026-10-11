import { describe, expect, it, vi } from 'vitest';

import { getXPostVideo } from './x-post.js';

const POST_URL = 'https://x.com/someone/status/2109089096282874054';

function mp4(bitrate: number, size: string) {
  return {
    content_type: 'video/mp4',
    bitrate,
    url: `https://video.twimg.com/amplify_video/1/vid/avc1/${size}/a.mp4`,
  };
}

const VIDEO = {
  type: 'video',
  video_info: {
    variants: [
      {
        content_type: 'application/x-mpegURL',
        url: 'https://video.twimg.com/amplify_video/1/pl/a.m3u8',
      },
      mp4(256000, '320x270'),
      mp4(10368000, '1282x1080'),
      mp4(2176000, '854x720'),
    ],
  },
};

function post(overrides: Record<string, unknown> = {}) {
  return {
    text: 'New in MyGo: flyouts https://t.co/abc123',
    user: { screen_name: 'someone' },
    mediaDetails: [VIDEO],
    ...overrides,
  };
}

const getVideo = (url: string, body: unknown) => {
  const fetchJson = vi.fn(async (_url: URL) => body);
  return { fetchJson, result: getXPostVideo(new URL(url), { fetchJson }) };
};

describe('getXPostVideo', () => {
  it('returns the highest bitrate mp4 of the first video', async () => {
    const { result } = getVideo(POST_URL, post());
    expect(await result).toEqual({
      url: 'https://video.twimg.com/amplify_video/1/vid/avc1/1282x1080/a.mp4',
      title: 'New in MyGo: flyouts',
    });
  });

  it('asks the syndication API for the post id', async () => {
    const { fetchJson, result } = getVideo(POST_URL, post());
    await result;
    const url = fetchJson.mock.calls[0]![0] as URL;
    expect(url.origin + url.pathname).toBe(
      'https://cdn.syndication.twimg.com/tweet-result',
    );
    expect(url.searchParams.get('id')).toBe('2109089096282874054');
    expect(url.searchParams.get('token')).toMatch(/^[a-z1-9]+$/);
  });

  it('skips photos and uses the first video or GIF', async () => {
    const gif = {
      type: 'animated_gif',
      video_info: { variants: [mp4(0, 'gif')] },
    };
    const { result } = getVideo(
      POST_URL,
      post({ mediaDetails: [{ type: 'photo' }, gif, VIDEO] }),
    );
    expect((await result)?.url).toBe(
      'https://video.twimg.com/amplify_video/1/vid/avc1/gif/a.mp4',
    );
  });

  it('uses the author when the post has no text', async () => {
    const { result } = getVideo(POST_URL, post({ text: 'https://t.co/abc' }));
    expect((await result)?.title).toBe('@someone');
  });

  it.each([
    ['no media', post({ mediaDetails: undefined })],
    ['photos only', post({ mediaDetails: [{ type: 'photo' }] })],
    ['an unknown shape', { __typename: 'TweetTombstone' }],
  ])('returns null for a post with %s', async (_, body) => {
    expect(await getVideo(POST_URL, body).result).toBeNull();
  });

  it('does not call the API for other URLs', async () => {
    const { fetchJson, result } = getVideo(
      'https://example.com/a/status/1',
      {},
    );
    expect(await result).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });
});
