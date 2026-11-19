import { Hono } from 'hono';
import { z } from 'zod';

import { readJsonBody } from '../json-body.js';
import {
  fetchSiteImage,
  getSitePreview,
  isRejectedUrlError,
} from './site-preview.js';

const MAX_URL_LENGTH = 2048;

const urlBodySchema = z.object({
  url: z
    .string()
    .trim()
    .max(MAX_URL_LENGTH)
    .pipe(z.url({ protocol: /^https?$/ }))
    .refine(
      (value) => {
        if (!URL.canParse(value)) return true; // the URL check above already reports this
        const { username, password } = new URL(value);
        return !username && !password;
      },
      { message: 'URL must not contain a user name or password' },
    ),
});

export function createSitesRouter({ appOrigin }: { appOrigin: string }) {
  const router = new Hono();

  router.post('/preview', async (c) => {
    const body = urlBodySchema.safeParse(await readJsonBody(c));
    if (!body.success) {
      return c.json(
        { error: 'invalid-url', message: 'Enter a valid http(s) URL' },
        400,
      );
    }

    try {
      return c.json(
        await getSitePreview(new URL(body.data.url), { appOrigin }),
      );
    } catch (error) {
      if (isRejectedUrlError(error)) {
        return c.json(
          { error: 'url-not-allowed', message: 'This URL cannot be previewed' },
          400,
        );
      }

      console.error('Site preview failed:', error);
      return c.json({ error: 'internal', message: 'Preview failed' }, 500);
    }
  });

  router.post('/image', async (c) => {
    const body = urlBodySchema.safeParse(await readJsonBody(c));
    if (!body.success) {
      return c.json(
        { error: 'invalid-url', message: 'Enter a valid http(s) URL' },
        400,
      );
    }

    try {
      const image = await fetchSiteImage(new URL(body.data.url));
      return c.body(image.body, 200, {
        'content-type': image.type,
      });
    } catch (error) {
      if (isRejectedUrlError(error)) {
        return c.json(
          {
            error: 'url-not-allowed',
            message: 'This URL cannot be downloaded',
          },
          400,
        );
      }

      console.error('Site image failed:', error);
      return c.json(
        { error: 'image-failed', message: 'Image download failed' },
        502,
      );
    }
  });

  return router;
}
