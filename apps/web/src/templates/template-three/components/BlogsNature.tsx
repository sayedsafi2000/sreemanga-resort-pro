'use client';

import { useRevealGroup } from '@/hooks/useReveal';
import Link from 'next/link';
import type { BlogListItem } from '@/types/resort';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  blogs: BlogListItem[];
}

export default function BlogsNature({ blogs }: Props) {
  const { ref, visible } = useRevealGroup<HTMLDivElement>();

  if (!blogs.length) return null;

  const [featured, ...rest] = blogs.slice(0, 4);

  return (
    <section className="bg-[#030d04] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-14">
          <div>
            <span className="text-[#3d7a4a] text-[10px] uppercase tracking-[0.35em] font-sans">Stories</span>
            <h2 className="font-display text-4xl md:text-5xl text-white mt-3">From the Garden</h2>
          </div>
          <Link
            href="/blogs"
            className="hidden md:inline-block text-xs uppercase tracking-widest text-[#c8920c] hover:text-[#d4a017] transition-colors"
          >
            All Stories →
          </Link>
        </div>

        <div ref={ref} className="grid md:grid-cols-5 gap-5">
          {/* Featured large card */}
          {featured && (
            <Link
              href={`/blogs/${featured.slug}`}
              className={`md:col-span-3 group block transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="relative overflow-hidden rounded-2xl aspect-[16/10] mb-4">
                {featured.imageUrl ? (
                  <img
                    src={featured.imageUrl}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a3a1e] to-[#0f2011]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <p className="text-[#6b9b6b] text-xs font-sans uppercase tracking-wider mb-2">
                    {featured.createdAt
                      ? formatDistanceToNow(new Date(featured.createdAt), { addSuffix: true })
                      : ''}
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl text-white group-hover:text-[#c8920c] transition-colors">
                    {featured.title}
                  </h3>
                </div>
              </div>
            </Link>
          )}

          {/* Smaller cards */}
          <div className="md:col-span-2 flex flex-col gap-5">
            {rest.map((blog, i) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.slug}`}
                className={`group flex gap-4 transition-all duration-700 ${
                  visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="relative overflow-hidden rounded-xl w-24 h-24 flex-shrink-0">
                  {blog.imageUrl ? (
                    <img
                      src={blog.imageUrl}
                      alt={blog.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1a3a1e]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#6b9b6b] text-[10px] font-sans uppercase tracking-wider mb-1">
                    {blog.createdAt
                      ? formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })
                      : ''}
                  </p>
                  <h3 className="font-display text-lg text-white group-hover:text-[#c8920c] transition-colors line-clamp-2">
                    {blog.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="text-center mt-8 md:hidden">
          <Link
            href="/blogs"
            className="inline-block px-8 py-3 border border-[#3d7a4a] text-[#a8d4a8] text-xs uppercase tracking-widest rounded-full hover:border-[#c8920c] hover:text-[#c8920c] transition-colors"
          >
            All Stories
          </Link>
        </div>
      </div>
    </section>
  );
}
