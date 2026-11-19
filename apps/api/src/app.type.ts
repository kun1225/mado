import type { Context } from 'hono';

export type AppGetClientIp = (context: Context) => string | undefined;
