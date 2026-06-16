import Stripe from 'stripe';

// `import Stripe from 'stripe'` binds the callable constructor. The instance
// type is exposed as `Stripe.Stripe` (re-exported by the SDK), so alias it.
type StripeClient = Stripe.Stripe;

// Singleton Stripe client. Cached on globalThis in non-prod so `tsx watch`
// reloads don't spin up a new client each time (mirrors utils/prisma.ts).
declare global {
  // eslint-disable-next-line no-var
  var stripeGlobal: StripeClient | null | undefined;
}

function createClient(): StripeClient | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set. Card payments disabled.');
    return null;
  }
  // apiVersion intentionally omitted — uses the version pinned by the installed SDK.
  return new Stripe(key);
}

const stripe: StripeClient | null =
  globalThis.stripeGlobal !== undefined ? globalThis.stripeGlobal : createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.stripeGlobal = stripe;
}

/** Throws a clean error if Stripe isn't configured, else returns the client. */
export function requireStripe(): StripeClient {
  if (!stripe) {
    throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).');
  }
  return stripe;
}

export default stripe;
