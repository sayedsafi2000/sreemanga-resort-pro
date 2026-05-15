'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center bg-cream py-20">
      <div className="mx-auto max-w-md px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-forest-700">Error</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-stone-900">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 text-stone-600">Please try again, or head back home.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-forest-700 px-8 py-3 font-semibold text-white shadow-md hover:bg-forest-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border-2 border-forest-800 px-8 py-3 font-semibold text-forest-900 hover:bg-forest-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
