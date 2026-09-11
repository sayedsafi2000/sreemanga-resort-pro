/**
 * Parses TRUST_PROXY into the value Express expects for `app.set('trust proxy')`.
 * Accepts "true"/"false", a hop count ("1"), or any Express string form
 * ("loopback", "10.0.0.0/8", comma-separated list). When unset, trusts one
 * hop in production (Coolify/Traefik, nginx) and nothing in development.
 */
export function parseTrustProxy(raw: string | undefined, isProduction: boolean): boolean | number | string {
  const v = raw?.trim() ?? '';
  if (v === '') return isProduction ? 1 : false;
  if (/^(true|yes)$/i.test(v)) return true;
  if (/^(false|no|0)$/i.test(v)) return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}
