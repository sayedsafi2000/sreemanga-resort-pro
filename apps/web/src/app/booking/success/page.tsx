import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';
import { confirmStripeSession } from '@/lib/resort-api';

export const metadata: Metadata = {
  title: 'Payment successful',
  robots: { index: false },
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  const status = sessionId ? await confirmStripeSession(sessionId) : null;
  const paid = status?.paid ?? false;

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-forest-950/8 via-cream to-stone-warm px-4 py-20">
      <div className="w-full max-w-md rounded-3xl border border-white/55 bg-white/55 p-8 text-center shadow-card backdrop-blur-md">
        {paid ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-forest-600" />
            <h1 className="mt-4 text-2xl font-bold text-stone-800">Payment successful</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              Your booking is confirmed. We&apos;ve emailed your confirmation and payment
              receipt. We look forward to welcoming you to Nirjon Nature&apos;s Hideout.
            </p>
          </>
        ) : (
          <>
            <Clock className="mx-auto h-14 w-14 text-amber-500" />
            <h1 className="mt-4 text-2xl font-bold text-stone-800">Processing payment</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">
              We&apos;re still confirming your payment. If you completed checkout, your
              booking will be confirmed shortly — refresh this page in a moment, or check
              your email.
            </p>
          </>
        )}
        {status?.bookingId && (
          <p className="mt-4 break-all rounded-lg bg-forest-50/70 px-3 py-2 text-xs text-stone-500">
            Booking ID: {status.bookingId}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-full bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-800"
          >
            Back to home
          </Link>
          <Link
            href="/rooms"
            className="rounded-full border border-forest-600/40 px-6 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-50"
          >
            Browse rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
