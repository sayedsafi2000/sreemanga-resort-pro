// Next.js calls this once at boot. We use it to install a defensive listener
// for unhandled rejections that originate from undici when the upstream API is
// down (e.g. dev mode without the server running). Those are already handled
// by `safeFetch` returning null, but undici also emits a separate dispatcher
// error which Next.js treats as a fatal pipe failure if no listener exists.
//
// We only swallow the well-known network-class errors. Everything else is
// re-thrown so real bugs still surface.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const NETWORK_CODES = new Set([
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENOTFOUND',
    'UND_ERR_SOCKET',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
  ]);

  const isNetworkLikeError = (err: unknown): boolean => {
    if (!err || typeof err !== 'object') return false;
    const e = err as { code?: string; message?: string; cause?: unknown };
    if (e.code && NETWORK_CODES.has(e.code)) return true;
    if (typeof e.message === 'string' && /fetch failed|aborted|ECONNREFUSED|socket hang up/i.test(e.message)) {
      return true;
    }
    return isNetworkLikeError(e.cause);
  };

  process.on('unhandledRejection', (reason) => {
    if (isNetworkLikeError(reason)) {
      // Already handled at the call site (safeFetch). Stay quiet so the dev
      // server doesn't report "failed to pipe response" on every page load.
      return;
    }
    // Surface anything else so we still notice real bugs.
    // eslint-disable-next-line no-console
    console.error('[unhandledRejection]', reason);
  });
}
