'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar } from 'lucide-react';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';
import type { BlogListItem } from '@/types/resort';

type Props = { blogs: BlogListItem[] };

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-BD', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function BlogsCinematic({ blogs }: Props) {
  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();

  if (!blogs.length) return null;

  const [featured, ...rest] = blogs.slice(0, 4);

  return (
    <section className="bg-[#060e07] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          ref={headRef}
          className={`reveal ${headVisible ? 'visible' : ''} mb-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-earth-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-earth-400">
                Journal
              </span>
            </div>
            <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
              Stories from the<br />
              <em className="not-italic text-earth-300">tea highlands</em>
            </h2>
          </div>
          <Link
            href="/blogs"
            className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-forest-400 transition hover:text-earth-400"
          >
            All stories
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Featured + secondary grid */}
        <div ref={gridRef} className="grid gap-4 lg:grid-cols-5 lg:grid-rows-2">

          {/* Featured — spans 3 cols and 2 rows */}
          <Link
            href={`/blogs/${featured.slug}`}
            className={`reveal ${gridVisible ? 'visible' : ''} group relative min-h-[320px] overflow-hidden lg:col-span-3 lg:row-span-2`}
          >
            {featured.imageUrl && (
              <Image
                src={featured.imageUrl}
                alt={featured.title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <span className="mb-3 inline-block border border-earth-400/40 bg-earth-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-earth-300">
                {featured.category}
              </span>
              <h3 className="font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
                {featured.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-forest-200/60 line-clamp-2">
                {featured.summary}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-forest-400">
                <Calendar className="h-3 w-3" />
                {formatDate(featured.createdAt)}
                <span className="text-forest-700">·</span>
                <span>{featured.authorName}</span>
              </div>
            </div>
          </Link>

          {/* Secondary cards */}
          {rest.map((blog, i) => (
            <Link
              key={blog.id}
              href={`/blogs/${blog.slug}`}
              className={`reveal ${gridVisible ? 'visible' : ''} group relative min-h-[160px] overflow-hidden lg:col-span-2`}
              style={{ transitionDelay: `${(i + 1) * 100}ms` }}
            >
              {blog.imageUrl && (
                <Image
                  src={blog.imageUrl}
                  alt={blog.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <span className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-earth-400">
                  {blog.category}
                </span>
                <h3 className="font-display text-lg font-semibold leading-snug text-white">
                  {blog.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
