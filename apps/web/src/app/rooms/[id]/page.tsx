import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ImageCarousel from '@/components/ImageCarousel';
import JsonLd from '@/components/seo/JsonLd';
import Container from '@/components/ui/Container';
import { getRoomById, getSettings } from '@/lib/resort-api';
import { ROOM_TYPE_LABEL, ROOM_ZONE_LABEL } from '@/lib/room-labels';
import T from '@/components/T';
import { siteUrl } from '@/lib/site';
import { Users, Check } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import L from '@/components/L';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const room = await getRoomById(params.id);
  if (!room) return { title: 'Room not found' };
  const settings = await getSettings();
  return {
    title: room.name,
    description: room.description || `Stay in ${room.name} at ${settings.resortName}. From ${fmtMoney(room.price)} per night.`,
    openGraph: {
      title: `${room.name} | ${settings.resortName}`,
      description: room.description || undefined,
      images: room.images[0] ? [{ url: room.images[0] }] : undefined,
    },
  };
}

const perks = [
  'Organic toiletries',
  'Daily housekeeping',
  'Tea & coffee station',
  'Blackout curtains',
  'Valley or garden outlook',
  'Climate control',
];

export default async function RoomDetailPage({ params }: Props) {
  const room = await getRoomById(params.id);
  if (!room) notFound();
  const maxAdults = room.maxAdults ?? room.capacity;
  const maxChildren = room.maxChildren ?? 0;
  const featureChips = [
    ...(room.facilities ? Object.entries(room.facilities).filter(([, v]) => v).map(([k]) => k) : []),
    ...(room.services ? Object.entries(room.services).filter(([, v]) => v).map(([k]) => k) : []),
    ...(room.experienceFeatures ? Object.entries(room.experienceFeatures).filter(([, v]) => v).map(([k]) => k) : []),
  ];
  const foodOptions = room.foodOptions || {};
  const bookingRules = room.bookingRules || {};
  const humanize = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HotelRoom',
    name: room.name,
    description: room.description,
    numberOfBeds: 1,
    occupancy: { '@type': 'QuantitativeValue', maxValue: room.capacity },
    image: room.images,
    offers: {
      '@type': 'Offer',
      price: room.price,
      priceCurrency: 'BDT',
    },
  };

  return (
    <div className="bg-cream pb-20 pt-10 sm:pt-14">
      <JsonLd data={jsonLd} />
      <Container>
        <nav className="mb-8 text-sm text-stone-500">
          <Link href="/rooms" className="hover:text-forest-800">
            ← Rooms
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <ImageCarousel images={room.images} alt={room.name} />
            <p className="mt-4 text-xs text-stone-500">
              <T en="Images shown for illustration; assignment may vary by season." bn="ছবি শুধু ধারণার জন্য; মৌসুম অনুযায়ী রুম বরাদ্দ বদলাতে পারে।" />
            </p>
          </div>

          <div>
            <span className="inline-block rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-forest-800">
              <T en={ROOM_TYPE_LABEL[room.type]?.en ?? room.type} bn={ROOM_TYPE_LABEL[room.type]?.bn} />{room.zone ? <> · <T en={ROOM_ZONE_LABEL[room.zone].en} bn={ROOM_ZONE_LABEL[room.zone].bn} /></> : null}
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">
              <L en={room.name} bn={room.nameBn} />
            </h1>
            {room.description && (
              <p className="mt-4 text-lg leading-relaxed text-stone-600"><L en={room.description} bn={room.descriptionBn} /></p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4 text-stone-600">
              <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-card">
                <Users className="h-5 w-5 text-forest-700" />
                <T en={`Up to ${maxAdults} adults${maxChildren ? ` + ${maxChildren} children` : ''}`} bn={`সর্বোচ্চ ${maxAdults} জন প্রাপ্তবয়স্ক${maxChildren ? ` + ${maxChildren} শিশু` : ''}`} />
              </span>
<span className="text-2xl font-semibold text-forest-800">
                  {fmtMoney(room.price)}
                  <span className="text-base font-normal text-stone-500"> / <T en="night" bn="রাত" /></span>
                </span>
            </div>

            <ul className="mt-8 space-y-2">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-2 text-stone-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-100 text-forest-800">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            {(room.roomCode || room.floorBuilding || room.roomSizeSqft || room.bedType) && (
              <div className="mt-6 rounded-xl bg-white p-4 shadow-card space-y-2 text-sm text-stone-700">
                {room.roomCode && <p><span className="font-medium">Room Code:</span> {room.roomCode}</p>}
                {room.floorBuilding && <p><span className="font-medium">Floor / Building:</span> {room.floorBuilding}</p>}
                {room.roomSizeSqft && <p><span className="font-medium">Room Size:</span> {room.roomSizeSqft} sq ft</p>}
                {room.bedType && <p><span className="font-medium">Bed Type:</span> {room.bedType}</p>}
              </div>
            )}
            {(room.weekendPrice || room.seasonalPrice || room.extraGuestCharge) && (
              <div className="mt-4 rounded-xl bg-white p-4 shadow-card space-y-2 text-sm text-stone-700">
                <h3 className="font-semibold text-stone-800">Pricing Details</h3>
                {room.weekendPrice && <p><span className="font-medium">Weekend:</span> {fmtMoney(room.weekendPrice)} / night</p>}
                {room.seasonalPrice && <p><span className="font-medium">Seasonal:</span> {fmtMoney(room.seasonalPrice)} / night</p>}
                {room.extraGuestCharge && <p><span className="font-medium">Extra Guest:</span> {fmtMoney(room.extraGuestCharge)}</p>}
              </div>
            )}
            {featureChips.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {featureChips.map((f) => (
                  <span key={f} className="rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-800">
                    {humanize(f)}
                  </span>
                ))}
              </div>
            )}
            {(foodOptions.freeBreakfast || foodOptions.lunchIncluded || foodOptions.dinnerIncluded || foodOptions.unlimitedTeaCoffee || foodOptions.roomServiceAvailable) && (
              <div className="mt-6 rounded-xl bg-white p-4 shadow-card">
                <h3 className="font-semibold text-stone-800 mb-2">Food Options</h3>
                <ul className="space-y-1 text-sm text-stone-700">
                  {foodOptions.freeBreakfast && <li>Free Breakfast {foodOptions.breakfastType ? `(${String(foodOptions.breakfastType).replace('_', ' ')})` : ''}</li>}
                  {foodOptions.lunchIncluded && <li>Lunch Included</li>}
                  {foodOptions.dinnerIncluded && <li>Dinner Included</li>}
                  {foodOptions.unlimitedTeaCoffee && <li>Unlimited Tea / Coffee</li>}
                  {foodOptions.roomServiceAvailable && <li>Room Service Available</li>}
                </ul>
              </div>
            )}
            {Array.isArray(room.addOns) && room.addOns.length > 0 && (
              <div className="mt-6 rounded-xl bg-white p-4 shadow-card">
                <h3 className="font-semibold text-stone-800 mb-2">Available Add-ons</h3>
                <ul className="space-y-1 text-sm text-stone-700">
                  {room.addOns.map((a) => (
                    <li key={`${a.name}-${a.price}`}>{a.name} - {fmtMoney(a.price)}{a.description ? ` (${a.description})` : ''}</li>
                  ))}
                </ul>
              </div>
            )}
            {(bookingRules.checkInTime || bookingRules.checkOutTime || bookingRules.cancellationPolicy || bookingRules.refundPolicy) && (
              <div className="mt-6 rounded-xl bg-white p-4 shadow-card">
                <h3 className="font-semibold text-stone-800 mb-2"><T en="Booking Rules" bn="বুকিং নিয়ম" /></h3>
                <ul className="space-y-1 text-sm text-stone-700">
                  {bookingRules.checkInTime && <li><span className="font-medium">Check-in:</span> {String(bookingRules.checkInTime)}</li>}
                  {bookingRules.checkOutTime && <li><span className="font-medium">Check-out:</span> {String(bookingRules.checkOutTime)}</li>}
                  {bookingRules.cancellationPolicy && <li><span className="font-medium">Cancellation:</span> {String(bookingRules.cancellationPolicy)}</li>}
                  {bookingRules.refundPolicy && <li><span className="font-medium">Refund:</span> {String(bookingRules.refundPolicy)}</li>}
                </ul>
              </div>
            )}

            <Link
              href={`/booking?room=${room.id}`}
              className="mt-10 inline-flex w-full justify-center rounded-full bg-forest-700 py-4 text-center font-semibold text-white shadow-md transition hover:bg-forest-800 sm:w-auto sm:px-12"
            >
              <T en="Book this room" bn="এই রুম বুক করুন" />
            </Link>
            <p className="mt-4 text-xs text-stone-500">
              <T en="Need help? Call us or use the contact form — we reply within one business day." bn="সাহায্য লাগবে? কল করুন বা contact form ব্যবহার করুন — এক কর্মদিবসের মধ্যে উত্তর দিই।" />
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
