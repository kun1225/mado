import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';

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
        if (!URL.canParse(value)) return true; // already reported above
        const { username, password } = new URL(value);
        return !username && !password;
      },
      { message: 'URL must not contain a user name or password' },
    ),
});

export function createSitesRouter({
  appOrigin,
}: {
  appOrigin: string;
}): ExpressRouter {
  const router = Router();

  router.post('/preview', async (request, response) => {
    const body = urlBodySchema.safeParse(request.body);
    if (!body.success) {
      response
        .status(400)
        .json({ error: 'invalid-url', message: 'Enter a valid http(s) URL' });
      return;
    }

    try {
      response.json(
        await getSitePreview(new URL(body.data.url), { appOrigin }),
      );
    } catch (error) {
      if (isRejectedUrlError(error)) {
        response.status(400).json({
          error: 'url-not-allowed',
          message: 'This URL cannot be previewed',
        });
        return;
      }

      console.error('Site preview failed:', error);
      response
        .status(500)
        .json({ error: 'internal', message: 'Preview failed' });
    }
  });

  router.post('/image', async (request, response) => {
    const body = urlBodySchema.safeParse(request.body);
    if (!body.success) {
      response
        .status(400)
        .json({ error: 'invalid-url', message: 'Enter a valid http(s) URL' });
      return;
    }

    try {
      const image = await fetchSiteImage(new URL(body.data.url));
      response.type(image.type).send(image.body);
    } catch (error) {
      if (isRejectedUrlError(error)) {
        response.status(400).json({
          error: 'url-not-allowed',
          message: 'This URL cannot be downloaded',
        });
        return;
      }

      console.error('Site image failed:', error);
      response
        .status(502)
        .json({ error: 'image-failed', message: 'Image download failed' });
    }
  });

  return router;
}
