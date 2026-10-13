import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';

import type { AuthInstance, AuthLocals } from './auth.type.js';

export function getCurrentUser(
  _request: Request,
  response: Response<unknown, AuthLocals>,
) {
  const { id, name, email, emailVerified, image } = response.locals.auth.user;
  response.json({ user: { id, name, email, emailVerified, image } });
}

// *** requireAuth ***
export function requireAuth(auth: AuthInstance) {
  return async (
    request: Request,
    response: Response<unknown, AuthLocals>,
    next: NextFunction,
  ) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }
    response.locals.auth = session;
    next();
  };
}
