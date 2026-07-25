import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { requireStripe } from '../utils/stripe';
import { emailService } from '../utils/emailService';
import { recordRevenue } from '../utils/accountLedger';

function webUrl(): string {
  return (process.env.WEB_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002').replace(/\/$/, '');
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

type BookingForCheckout = {
  id: string;
  totalAmount: number;
  checkInDate: Date;
  checkOutDate: Date;
  room: { name: string };
  guest: { email: string | null };
};

// Minimal shape of a Checkout Session — only the fields we read. Avoids the
// SDK's namespaced types (Stripe.Checkout.Session) which aren't reachable
// through the default import.
interface CheckoutSessionLike {
  id: string;
  payment_intent: string | { id: string } | null;
}

function paymentIntentId(session: CheckoutSessionLike): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === 'string' ? pi : pi.id;
}

/**
 * Create a Stripe Checkout Session for a freshly-created PENDING booking and
 * persist the session id on its Payment row. Returns the hosted checkout URL.
 * Currency is BDT (2-decimal) → unit_amount = total × 100.
 */
export async function createCheckoutSessionForBooking(
  booking: BookingForCheckout,
  paymentId: string
): Promise<string> {
  const stripe = requireStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'bdt',
          unit_amount: Math.round(booking.totalAmount * 100),
          product_data: {
            name: `${booking.room.name} · ${fmtDate(booking.checkInDate)} → ${fmtDate(booking.checkOutDate)}`,
          },
        },
      },
    ],
    customer_email: booking.guest.email || undefined,
    metadata: { bookingId: booking.id, paymentId },
    success_url: `${webUrl()}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${webUrl()}/booking/cancel?booking=${booking.id}`,
  });

  await prisma.payment.update({
    where: { id: paymentId },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return session.url;
}

async function fulfillCheckout(session: CheckoutSessionLike): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: session.id },
    include: { booking: { include: { room: true, guest: true } } },
  });
  if (!payment) {
    console.warn(`[Stripe] Webhook: no payment for session ${session.id}`);
    return;
  }
  if (!payment.booking || !payment.bookingId) {
    console.warn(`[Stripe] Webhook: payment ${payment.id} has no booking; skipping.`);
    return;
  }
  // Idempotency — Stripe retries webhooks; only fulfill once.
  if (payment.status === 'COMPLETED') return;

  const piId = paymentIntentId(session);

  const bookingId = payment.bookingId;
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        stripePaymentIntentId: piId,
        transactionId: piId,
        referenceType: payment.referenceType || 'BOOKING',
        referenceId: payment.referenceId || bookingId,
        businessLine: payment.businessLine || 'ROOM',
      },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' },
    });
    await recordRevenue(tx, {
      amount: payment.amount,
      method: payment.method || 'STRIPE',
      businessLine: (payment.businessLine as string) || 'ROOM',
      referenceType: payment.referenceType || 'BOOKING',
      referenceId: payment.referenceId || bookingId,
    });
  });

  const b = payment.booking;
  if (b.guest.email) {
    emailService
      .sendPaymentConfirmationEmail(b.guest.email, {
        bookingId: b.id,
        guestName: b.guest.name,
        amount: payment.amount,
        method: 'Card (Stripe)',
        transactionId: piId ?? undefined,
      })
      .catch((err) => console.error('[Stripe] Payment email failed:', err));

    emailService
      .sendBookingConfirmationEmail(b.guest.email, {
        bookingId: b.id,
        guestName: b.guest.name,
        roomName: b.room.name,
        checkInDate: fmtDate(b.checkInDate),
        checkOutDate: fmtDate(b.checkOutDate),
        totalAmount: b.totalAmount,
        adults: b.adults,
        children: b.children,
      })
      .catch((err) => console.error('[Stripe] Booking confirm email failed:', err));
  }
}

async function expireCheckout(session: CheckoutSessionLike): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (!payment || payment.status === 'COMPLETED') return;
  if (!payment.bookingId) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    return;
  }

  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }),
    prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'CANCELLED' } }),
  ]);
}

/**
 * Stripe webhook. MUST receive the raw request body (mounted with
 * express.raw before the global express.json middleware) so the signature
 * can be verified.
 */
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const stripe = requireStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];

  if (!secret || !sig) {
    res.status(400).send('Missing webhook secret or signature.');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[Stripe] Signature verification failed:', err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await fulfillCheckout(event.data.object as unknown as CheckoutSessionLike);
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await expireCheckout(event.data.object as unknown as CheckoutSessionLike);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`[Stripe] Handler error for ${event.type}:`, err);
    res.status(500).send('Webhook handler failed.');
    return;
  }

  res.json({ received: true });
}

/**
 * Retrieve a Checkout Session and fulfill the booking if it's paid. Lets the
 * /booking/success page confirm payment without relying on the webhook —
 * essential for local dev (no Stripe CLI/tunnel). Idempotent: fulfillCheckout
 * is a no-op once the payment is already COMPLETED.
 */
export async function getCheckoutStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stripe = requireStripe();
    const id = req.params.id;
    const session = await stripe.checkout.sessions.retrieve(id);

    if (session.payment_status === 'paid') {
      await fulfillCheckout(session as unknown as CheckoutSessionLike);
    }

    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: id },
      include: { booking: true },
    });

    res.json({
      paid: session.payment_status === 'paid',
      paymentStatus: session.payment_status,
      bookingId: payment?.bookingId ?? null,
      bookingStatus: payment?.booking?.status ?? null,
    });
  } catch (err) {
    next(err);
  }
}
