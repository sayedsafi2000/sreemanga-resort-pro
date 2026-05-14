'use client';

import {
  Wifi,
  Car,
  Utensils,
  Waves,
  TreePine,
  Wind,
  Shield,
  Coffee,
  Flower2,
  Bike,
} from 'lucide-react';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';

const facilities = [
  { icon: TreePine,  label: 'Tea Garden Walks',   desc: 'Guided trails through lush estates' },
  { icon: Waves,     label: 'Swimming Pool',       desc: 'Open-air pool surrounded by nature' },
  { icon: Utensils,  label: 'Farm-to-Table Dining',desc: 'Seasonal local cuisine every day' },
  { icon: Wifi,      label: 'High-Speed WiFi',     desc: 'Strong connectivity throughout' },
  { icon: Car,       label: 'Free Parking',        desc: 'Secure on-site parking available' },
  { icon: Coffee,    label: 'Tea Experience',       desc: 'Learn the art of tea tasting' },
  { icon: Wind,      label: 'Fresh Mountain Air',  desc: 'Pure air away from the city' },
  { icon: Flower2,   label: 'Garden Spaces',       desc: 'Manicured gardens and open lawns' },
  { icon: Shield,    label: '24/7 Security',       desc: 'Round-the-clock safety and care' },
  { icon: Bike,      label: 'Cycle Hire',          desc: 'Explore nearby trails on two wheels' },
] as const;

export default function FacilitiesDark() {
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();

  return (
    <section className="bg-[#09100a] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          ref={headRef}
          className={`reveal ${headVisible ? 'visible' : ''} mb-14 max-w-2xl`}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-8 bg-earth-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
              Amenities
            </span>
          </div>
          <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
            Everything you need<br />
            <em className="not-italic text-earth-300">for a perfect escape</em>
          </h2>
        </div>

        {/* Facilities grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-2 gap-px border border-forest-900/50 bg-forest-900/20 sm:grid-cols-3 lg:grid-cols-5"
        >
          {facilities.map(({ icon: Icon, label, desc }, i) => (
            <div
              key={label}
              className={`reveal ${gridVisible ? 'visible' : ''} group flex flex-col gap-3 bg-[#09100a] p-6 transition-colors duration-300 hover:bg-[#0d1a0f]`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <span className="flex h-10 w-10 items-center justify-center border border-earth-400/20 bg-earth-400/5 text-earth-400 transition-colors duration-300 group-hover:border-earth-400/40 group-hover:bg-earth-400/10">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-0.5 text-xs leading-snug text-forest-400/70">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
