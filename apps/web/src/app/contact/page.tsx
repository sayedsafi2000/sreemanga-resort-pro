import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { getSettings } from '@/lib/resort-api';
import { MapPin, Phone, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Address, phone, and map for Nirjon Nature Escape in Sreemangal—reach us for stays, events, and directions.',
};

export default async function ContactPage() {
  const settings = await getSettings();
  const embed = settings.mapEmbedUrl?.trim();

  return (
    <div className="bg-cream pb-20 pt-10 sm:pt-14">
      <Container>
        <SectionHeading
          title="Contact & location"
          subtitle="We respond within one business day—urgent travel-day questions? Call us directly."
        />

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
              <h2 className="font-display text-xl font-semibold text-stone-900">Resort</h2>
              <ul className="mt-4 space-y-4 text-stone-700">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" />
                  {settings.address}
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-forest-700" />
                  <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="hover:underline">
                    {settings.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-forest-700" />
                  <a href={`mailto:${settings.email}`} className="hover:underline">
                    {settings.email}
                  </a>
                </li>
              </ul>
            </div>

            <ContactForm />
          </div>

          <div id="map" className="overflow-hidden rounded-2xl bg-stone-200 shadow-card scroll-mt-24">
            {embed ? (
              <iframe
                title="Map"
                src={embed}
                className="h-[min(420px,70vh)] w-full border-0"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-[min(420px,70vh)] flex-col items-center justify-center bg-forest-100 p-6 text-center text-stone-600">
                <MapPin className="mb-2 h-10 w-10 text-forest-700" />
                <p>
                  Add a Google Maps embed URL in admin settings <code className="rounded bg-white/80 px-1">mapEmbedUrl</code>{' '}
                  to show the map here.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
