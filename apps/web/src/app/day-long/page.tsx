import type { Metadata } from 'next';
import { getDayLongProducts } from '@/lib/resort-api';
import DayLongBookingForm from '@/components/day-long/DayLongBookingForm';

export const metadata: Metadata = {
  title: 'Day Long',
  description:
    'Day-use passes — swimming pool, day cottages, conference room, event space and picnic spots at the resort. Book by the day, no overnight stay required.',
};

const CATEGORY_LABELS: Record<string, string> = {
  POOL: 'Swimming Pool',
  COTTAGE: 'Day Cottage',
  CONFERENCE: 'Conference',
  EVENT: 'Event Space',
  PICNIC: 'Picnic',
};

export default async function DayLongPage() {
  const products = await getDayLongProducts();
  const byCategory = products.reduce<Record<string, typeof products>>((acc, p) => {
    (acc[p.category] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-green-800 py-14 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">Day Long Packages</h1>
        <p className="mx-auto mt-3 max-w-2xl px-4 text-green-100">
          Enjoy the resort for a day — pool, cottages, conference room, events and picnics. No overnight stay needed.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            Day-long packages are being updated. Please check back soon or call us.
          </p>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
            {/* Product catalog */}
            <div className="space-y-10">
              {Object.entries(byCategory).map(([cat, items]) => (
                <section key={cat}>
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {items.map((p) => (
                      <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-gray-900">{p.name}</h3>
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            {CATEGORY_LABELS[p.category] ?? p.category}
                          </span>
                        </div>
                        {p.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{p.description}</p>
                        )}
                        <div className="mt-3 text-sm text-gray-700">
                          <span className="text-lg font-bold text-gray-900">৳{p.basePrice}</span>
                          {p.pricePerPerson ? (
                            <span className="text-gray-500"> + ৳{p.pricePerPerson}/person</span>
                          ) : null}
                        </div>
                        {p.maxCapacity != null && (
                          <p className="mt-1 text-xs text-gray-500">Up to {p.maxCapacity} persons</p>
                        )}
                        {p.facilities && p.facilities.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {p.facilities.map((f) => (
                              <span key={f} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Booking form */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <DayLongBookingForm products={products} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
