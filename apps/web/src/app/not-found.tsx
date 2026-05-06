import Link from 'next/link';
import Container from '@/components/ui/Container';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center bg-cream py-20">
      <Container className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-forest-700">404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-stone-900">This path is still forest</h1>
        <p className="mx-auto mt-3 max-w-md text-stone-600">
          The page you wanted is not here. Head back home or explore rooms.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-forest-700 px-8 py-3 font-semibold text-white shadow-md hover:bg-forest-800"
          >
            Home
          </Link>
          <Link
            href="/rooms"
            className="rounded-full border-2 border-forest-800 px-8 py-3 font-semibold text-forest-900 hover:bg-forest-50"
          >
            Rooms
          </Link>
        </div>
      </Container>
    </div>
  );
}
