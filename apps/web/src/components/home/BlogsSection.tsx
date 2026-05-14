'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { BlogListItem } from '@/types/resort';
import SectionHeading from '@/components/SectionHeading';
import Container from '@/components/ui/Container';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReveal, useRevealGroup } from '@/hooks/useReveal';

export default function BlogsSection({ blogs }: { blogs: BlogListItem[] }) {
  const { tr } = useLanguage();
  if (!blogs.length) return null;

  const featured = blogs.filter((b) => b.isFeatured).slice(0, 3);
  const display  = featured.length ? featured : blogs.slice(0, 3);

  const { ref: headRef, visible: headVisible } = useReveal<HTMLDivElement>();
  const { ref: gridRef, visible: gridVisible } = useRevealGroup<HTMLDivElement>();
  const { ref: ctaRef,  visible: ctaVisible  } = useReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden bg-cream py-14 sm:py-20">
      <div className="pointer-events-none absolute inset-0 grain opacity-25" aria-hidden />
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-forest-200/20 blur-[100px]" aria-hidden />

      <Container className="relative z-10">

        <div ref={headRef} className={`reveal ${headVisible ? 'visible' : ''}`}>
          <SectionHeading
            eyebrow={tr('sections', 'blogEyebrow')}
            title={tr('sections', 'blogTitle')}
            subtitle={tr('sections', 'blogSubtitle')}
            decorate
          />
        </div>

        <div ref={gridRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((blog, i) => (
            <div
              key={blog.id}
              className={`reveal ${gridVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <Link href={`/blogs/${blog.slug}`} className="group block h-full">
                <article className="h-full overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover">
                  {/* Image with zoom */}
                  <div className="img-zoom relative aspect-[16/10] overflow-hidden bg-forest-100">
                    <Image
                      src={blog.imageUrl}
                      alt={blog.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {blog.isFeatured && (
                      <span className="absolute left-3 top-3 rounded-full bg-forest-800/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
                        {blog.category}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-semibold leading-snug text-stone-900 transition-colors group-hover:text-forest-800 line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-500">
                      {blog.summary}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-forest-100/70 pt-4">
                      <span className="flex items-center gap-1.5 text-xs text-stone-400">
                        <CalendarDays className="h-3.5 w-3.5 text-forest-400" aria-hidden />
                        {new Date(blog.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-forest-700 transition-all group-hover:gap-1.5 group-hover:text-forest-800">
                        Read
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          ))}
        </div>

        <div
          ref={ctaRef}
          className={`mt-10 text-center reveal ${ctaVisible ? 'visible' : ''}`}
          style={{ transitionDelay: '200ms' }}
        >
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white px-7 py-3 text-sm font-semibold text-forest-800 shadow-card transition-all hover:bg-forest-50 hover:shadow-card-hover hover:-translate-y-px"
          >
            {tr('home', 'viewAll')} Articles
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
