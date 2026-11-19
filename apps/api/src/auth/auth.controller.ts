import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import type { AuthInstance, AuthVariables } from './auth.type.js';

export function getCurrentUser(c: Context<{ Variables: AuthVariables }>) {
  const { id, name, email, emailVerified, image } = c.get('auth').user;
  return c.json({ user: { id, name, email, emailVerified, image } });
}

// *** requireAuth ***
export function requireAuth(auth: AuthInstance) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: 'unauthorized' }, 401);
    c.set('auth', session);
    await next();
  });
}
