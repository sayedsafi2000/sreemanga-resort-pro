'use client';

import { useRevealGroup } from '@/hooks/useReveal';

const FACILITIES = [
  { emoji: '🌿', title: 'Tea Garden Tours', desc: 'Walk through endless lush tea plantations with expert guides' },
  { emoji: '🏊', title: 'Infinity Pool', desc: 'Perched above the canopy with panoramic forest views' },
  { emoji: '🍃', title: 'Organic Dining', desc: 'Seasonal farm-to-table menus from our own kitchen garden' },
  { emoji: '🧖', title: 'Forest Spa', desc: 'Traditional Ayurvedic treatments using forest botanicals' },
  { emoji: '🚵', title: 'Eco Trails', desc: 'Guided nature treks through protected reserve forests' },
  { emoji: '🌅', title: 'Sunrise Watch', desc: 'Dawn breaks over a sea of green tea garden terraces' },
];

export default function FacilitiesNature() {
  const { ref, visible } = useRevealGroup<HTMLDivElement>();

  return (
    <section className="bg-[#0a1b0c] py-24 px-6 relative overflow-hidden">
      {/* Background texture lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        {Array(12).fill(null).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-[#3d7a4a]"
            style={{ top: `${(i + 1) * (100 / 13)}%` }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">Facilities</span>
          <h2 className="font-display text-4xl md:text-5xl text-white mt-3">What Awaits You</h2>
          <p className="text-[#5a8a5a] mt-4 max-w-lg mx-auto text-sm">
            Every detail curated for a perfect communion with nature
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FACILITIES.map((f, i) => (
            <div
              key={i}
              className={`group p-7 rounded-2xl border border-[#1a3a1e] bg-[#050e05] hover:border-[#3d7a4a] hover:bg-[#0a1b0c] transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className="text-3xl mb-5 transition-transform duration-300 group-hover:-translate-y-1"
                style={{ filter: 'drop-shadow(0 0 8px rgba(200,146,12,0.3))' }}
              >
                {f.emoji}
              </div>
              <h3 className="font-display text-xl text-white mb-2 group-hover:text-[#c8920c] transition-colors">
                {f.title}
              </h3>
              <p className="text-[#4a6e4a] text-sm leading-relaxed">{f.desc}</p>
              <div className="mt-4 h-px bg-gradient-to-r from-[#c8920c]/0 via-[#c8920c]/40 to-[#c8920c]/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
