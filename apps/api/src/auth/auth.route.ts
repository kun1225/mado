import { Hono } from 'hono';

import type { AppGetClientIp } from '../app.type.js';
import { getCurrentUser, requireAuth } from './auth.controller.js';
import type { AuthInstance, AuthVariables } from './auth.type.js';

const CLIENT_IP_HEADER = 'x-mado-client-ip';

export function createAuthRouter(
  auth: AuthInstance,
  getClientIp: AppGetClientIp,
) {
  const router = new Hono<{ Variables: AuthVariables }>();
  router.all('/auth/*', (c) =>
    auth.handler(withClientIp(c.req.raw, getClientIp(c))),
  );
  router.get('/me', requireAuth(auth), getCurrentUser);
  return router;
}

// *** withClientIp ***
// Set it ourselves so a client cannot pick its own rate-limit identity.
function withClientIp(request: Request, ip: string | undefined): Request {
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  return new Request(request, { headers });
}
