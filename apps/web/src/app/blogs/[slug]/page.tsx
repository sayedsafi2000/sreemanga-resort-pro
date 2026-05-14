import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, User, Tag } from 'lucide-react';
import Container from '@/components/ui/Container';
import { getBlogBySlug } from '@/lib/resort-api';
import { siteUrl } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: 'Blog Not Found' };
  return {
    title: blog.title,
    description: blog.summary,
    openGraph: {
      title: blog.title,
      description: blog.summary,
      type: 'article',
      authors: [blog.authorName],
      publishedTime: blog.createdAt,
      images: [{ url: blog.imageUrl }],
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function BlogPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) notFound();

  const formattedDate = new Date(blog.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-cream pb-24 pt-10 sm:pt-14">
      {/* Subtle grain */}
      <div className="pointer-events-none fixed inset-0 grain opacity-20" aria-hidden />

      <Container className="relative z-10 max-w-3xl">
        {/* Back link */}
        <Link
          href="/blogs"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-forest-600 transition hover:text-forest-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All articles
        </Link>

        <article>
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="mb-8 text-center">
            {/* Category + tags */}
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-forest-800">
                {blog.category}
              </span>
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full border border-forest-200 px-2.5 py-0.5 text-xs font-medium text-forest-600"
                >
                  <Tag className="h-2.5 w-2.5" aria-hidden />
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
              {blog.title}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-500">
              {blog.summary}
            </p>

            {/* Meta row */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-stone-400">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-forest-400" aria-hidden />
                {blog.authorName}
              </span>
              <span className="h-1 w-1 rounded-full bg-stone-300" />
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-forest-400" aria-hidden />
                {formattedDate}
              </span>
            </div>
          </header>

          {/* ── Hero image ────────────────────────────────────────────────── */}
          <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-forest-100 shadow-soft">
            <Image
              src={blog.imageUrl}
              alt={blog.title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/20 to-transparent" />
          </div>

          {/* ── Article body ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-forest-100/60 bg-white px-6 py-8 shadow-card sm:px-10 sm:py-10">
            <div className="prose prose-stone prose-lg max-w-none
              prose-headings:font-display prose-headings:text-stone-900
              prose-h2:text-2xl prose-h3:text-xl
              prose-p:text-stone-600 prose-p:leading-relaxed
              prose-a:text-forest-700 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-stone-800
              prose-blockquote:border-forest-400 prose-blockquote:bg-forest-50/50 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
              prose-code:text-forest-800 prose-code:bg-forest-50 prose-code:px-1 prose-code:rounded
              prose-img:rounded-xl prose-img:shadow-card
            ">
              {blog.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* ── CTA footer ────────────────────────────────────────────────── */}
          <div className="mt-10 overflow-hidden rounded-2xl bg-gradient-to-br from-forest-800 to-forest-950 p-8 text-center shadow-panel sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest-300">
              Ready to experience it?
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
              Book your stay at Sreemangal
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-forest-100/80">
              Walk the tea gardens, breathe the clean air, and make your own stories to tell.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/booking"
                className="btn-book-light ring-2 ring-white/25"
              >
                Book Your Stay
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </article>
      </Container>
    </div>
  );
}
