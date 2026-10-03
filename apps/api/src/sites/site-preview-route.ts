import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';

import { SafeFetchError } from './site-preview-safe-fetch.js';
import { getSitePreview } from './site-preview.js';

const MAX_URL_LENGTH = 2048;

const previewBodySchema = z.object({
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
    const body = previewBodySchema.safeParse(request.body);
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
      if (error instanceof SafeFetchError) {
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

  return router;
}
