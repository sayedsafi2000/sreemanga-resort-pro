import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingForm from '@/components/BookingForm';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import DarkPageHeader from '@/templates/template-two/components/DarkPageHeader';
import { getRooms, getSettings } from '@/lib/resort-api';

export const metadata: Metadata = {
  title: 'Book your stay',
  description: 'Choose dates, guest count, and room—submit a booking request for Nirjon Nature Escape.',
};

export default async function BookingPage() {
  const [roomsResult, settings] = await Promise.all([getRooms(), getSettings()]);
  const { rooms, ok: roomsOk } = roomsResult;
  const isT2 = settings.activeTemplate === 'template-two' || settings.activeTemplate === 'template-three';

  const emptyMessage = !roomsOk
    ? 'We could not load rooms right now. Please refresh or call us.'
    : 'No rooms available to book online right now. Please call us.';

  if (isT2) {
    return (
      <div className="min-h-screen bg-[#060e07] pb-24">
        <DarkPageHeader
          eyebrow="Reservations"
          title="Reserve Your Dates"
          subtitle="We will confirm availability and share payment options within one business day."
        />
        <div className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute -left-40 top-0 h-80 w-80 rounded-full bg-earth-400/5 blur-3xl" aria-hidden />

          {rooms.length === 0 ? (
            <p className="border border-forest-900/60 bg-[#0a130b] p-8 text-center text-forest-500">
              {emptyMessage}
            </p>
          ) : (
            <Suspense
              fallback={
                <div className="h-64 animate-pulse border border-forest-900/40 bg-forest-950/50" aria-hidden />
              }
            >
              <BookingForm rooms={rooms} variant="dark" />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-forest-950/8 via-cream to-stone-warm pb-24 pt-10 sm:pt-14">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-forest-400/18 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-40 h-80 w-80 rounded-full bg-forest-200/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] grain" aria-hidden />
      <Container className="relative z-10 max-w-3xl">
        <SectionHeading
          title="Reserve your dates"
          subtitle="We will confirm availability and share payment options. Demo mode shows a success message without charging."
        />
        {rooms.length === 0 ? (
          <p className="rounded-2xl border border-white/50 bg-white/55 p-8 text-center text-stone-600 shadow-card backdrop-blur-md">
            {emptyMessage}
          </p>
        ) : (
          <Suspense
            fallback={<div className="h-64 animate-pulse rounded-2xl bg-white/30 backdrop-blur-md" aria-hidden />}
          >
            <BookingForm rooms={rooms} />
          </Suspense>
        )}
      </Container>
    </div>
  );
}
