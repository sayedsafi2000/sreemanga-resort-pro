import type { Metadata } from 'next';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payment cancelled',
  robots: { index: false },
};

export default function BookingCancelPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-forest-950/8 via-cream to-stone-warm px-4 py-20">
      <div className="w-full max-w-md rounded-3xl border border-white/55 bg-white/55 p-8 text-center shadow-card backdrop-blur-md">
        <XCircle className="mx-auto h-14 w-14 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-stone-800">Payment cancelled</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Your card payment was not completed, so your dates are not yet secured.
          You can return to the booking page and try again, or choose another payment
          method.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/booking"
            className="rounded-full bg-forest-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-800"
          >
            Try booking again
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-forest-600/40 px-6 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-50"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
