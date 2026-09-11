const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Entity id for an audit row. Prefers the route param, but middleware mounted
 * with `app.use('/api/x', …)` runs before the router fills `req.params`, so
 * fall back to the first UUID in the request path.
 */
export function extractEntityId(path: string | undefined, paramId?: string): string | null {
  if (paramId) return paramId;
  if (!path) return null;
  const match = path.split('?')[0].match(UUID_RE);
  return match ? match[0] : null;
}
