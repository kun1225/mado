import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Only JSON counts, because a cross-site form can send text or form bodies
// without a CORS preflight. Other types return undefined, so the schema rejects them.
export async function readJsonBody(c: Context): Promise<unknown> {
  const type = c.req.header('content-type')?.split(';')[0]?.trim();
  if (type?.toLowerCase() !== 'application/json') return undefined;

  try {
    return await c.req.json();
  } catch {
    // Bad JSON is the client's fault, so it gets a 400 instead of a 500.
    throw new HTTPException(400, {
      res: Response.json(
        { error: 'invalid-json', message: 'Body must be valid JSON' },
        { status: 400 },
      ),
    });
  }
}
