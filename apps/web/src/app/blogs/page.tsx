import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays, User } from 'lucide-react';
import Container from '@/components/ui/Container';
import SectionHeading from '@/components/SectionHeading';
import { getBlogs } from '@/lib/resort-api';

export const metadata: Metadata = {
  title: 'Travel Blog — Stories from Sreemangal',
  description:
    "Read travel guides, nature tips, and local food recommendations from Nirjon Nature's Hideout in Sreemangal, Sylhet.",
};

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <div className="min-h-screen bg-cream pb-24 pt-10 sm:pt-14">
      {/* Subtle background texture */}
      <div className="pointer-events-none fixed inset-0 grain opacity-20" aria-hidden />

      <Container className="relative z-10">
        <SectionHeading
          eyebrow="Travel Guide · Blog"
          title="Stories from Sreemangal"
          subtitle="Discover nature trails, tea garden tours, local flavors, and hidden gems around the tea capital of Bangladesh."
          decorate
        />

        {blogs.length === 0 ? (
          <div className="rounded-2xl border border-forest-100 bg-white p-16 text-center shadow-card">
            <p className="text-stone-400">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <Link key={blog.id} href={`/blogs/${blog.slug}`} className="group block">
                <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover">
                  {/* Cover image */}
                  <div className="img-zoom relative aspect-[16/10] overflow-hidden bg-forest-100">
                    <Image
                      src={blog.imageUrl}
                      alt={blog.title}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-forest-950/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    {blog.isFeatured && (
                      <span className="absolute left-3 top-3 rounded-full bg-forest-800/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-6">
                    {/* Category & tags */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-forest-100 px-3 py-0.5 text-xs font-semibold text-forest-800">
                        {blog.category}
                      </span>
                    </div>

                    <h2 className="font-display text-xl font-semibold leading-snug text-stone-900 transition-colors group-hover:text-forest-800 line-clamp-2">
                      {blog.title}
                    </h2>

                    <p className="mt-2 flex-1 line-clamp-3 text-sm leading-relaxed text-stone-500">
                      {blog.summary}
                    </p>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between border-t border-forest-100/60 pt-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-xs text-stone-400">
                          <User className="h-3 w-3 text-forest-400" aria-hidden />
                          {blog.authorName}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-stone-400">
                          <CalendarDays className="h-3 w-3 text-forest-400" aria-hidden />
                          {new Date(blog.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-forest-700 transition-all group-hover:gap-1.5 group-hover:text-forest-800">
                        Read
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
