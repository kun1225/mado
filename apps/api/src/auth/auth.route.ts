import { toNodeHandler } from 'better-auth/node';
import { Router } from 'express';

import { getCurrentUser, requireAuth } from './auth.controller.js';
import type { AuthInstance } from './auth.type.js';

export function createAuthRouter(auth: AuthInstance): Router {
  const router = Router();
  router.use((request, _response, next) => {
    // Overwrite the header so clients cannot choose their rate-limit identity.
    request.headers['x-mado-client-ip'] = request.ip;
    next();
  });
  router.all('/auth/*splat', toNodeHandler(auth));
  router.get('/me', requireAuth(auth), getCurrentUser);
  return router;
}
