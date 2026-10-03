import type { NextFunction, Request, Response } from 'express';

// Bad JSON bodies would otherwise get Express's default page with a stack trace.
export function invalidJsonHandler(
  error: Error & { type?: string },
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (error.type !== 'entity.parse.failed') return next(error);
  response
    .status(400)
    .json({ error: 'invalid-json', message: 'Body must be valid JSON' });
}
