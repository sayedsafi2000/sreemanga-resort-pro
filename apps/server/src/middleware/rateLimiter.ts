import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const perMinute = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Auth endpoints — brute-force protection on login/register.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: perMinute('AUTH_RATE_LIMIT_PER_15MIN', 20), // per IP; raise only for automated QA
  message: { success: false, message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP send — prevent email spam.
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global API cap. Staff all sit behind the same office IP, and every admin page load fires
 * several requests, so signed-in traffic is bucketed per bearer token instead of per IP —
 * one busy receptionist can't lock out the whole front desk. Anonymous traffic (public site,
 * login) stays per IP. Override with API_RATE_LIMIT_PER_MIN.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: perMinute('API_RATE_LIMIT_PER_MIN', 600),
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ') && auth.length > 40) return `tok:${auth.slice(-32)}`;
    return ipKeyGenerator(req.ip ?? '');
  },
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
