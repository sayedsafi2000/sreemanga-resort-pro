'use client';

import { useMemo, useState } from 'react';
import type { GalleryItem } from '@/types/resort';
import { cn } from '@/lib/utils';

type Props = {
  items: GalleryItem[];
};

export default function GalleryGrid({ items }: Props) {
  const categories = useMemo(() => {
    const s = new Set(items.map((g) => g.category));
    return ['All', ...Array.from(s)];
  }, [items]);

  const [cat, setCat] = useState('All');

  const filteredItems = useMemo(() => {
    if (cat === 'All') return items;
    return items.filter((g) => g.category === cat);
  }, [cat, items]);

  return (
    <>
      <div className="mb-10 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold shadow-card transition-all duration-200 hover:-translate-y-px',
              cat === c
                ? 'bg-forest-800 text-white shadow-soft'
                : 'bg-white text-stone-600 hover:bg-forest-50 hover:text-forest-800'
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {filteredItems.map((g) => (
          <div
            key={g.id}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-card"
          >
            {/* Use native img — works with data: URLs and any http/https src */}
            <img
              src={g.src}
              alt={g.alt}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/55 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <span className="absolute bottom-3 left-3 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {g.category}
            </span>
          </div>
        ))}
      </div>
      {filteredItems.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-600 shadow-card">
          No photos yet. Super Admin can add images under <strong>Site gallery</strong> in the admin panel (category and sort order optional).
        </p>
      )}
    </>
  );
}
