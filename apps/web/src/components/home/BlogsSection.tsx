'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BlogListItem } from '@/types/resort';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BlogsSection({ blogs }: { blogs: BlogListItem[] }) {
  const { tr } = useLanguage();
  if (!blogs.length) return null;

  const featured = blogs.filter((b) => b.isFeatured).slice(0, 3);
  const display = featured.length ? featured : blogs.slice(0, 3);

  return (
    <section className="py-10 bg-stone-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-amber-700 font-medium mb-2">{tr('sections', 'blogEyebrow')}</p>
          <h2 className="text-3xl md:text-4xl font-serif text-stone-800">{tr('sections', 'blogTitle')}</h2>
          <p className="text-stone-600 mt-2 max-w-2xl mx-auto">{tr('sections', 'blogSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {display.map((blog) => (
            <Link key={blog.id} href={`/blogs/${blog.slug}`} className="group block">
              <article className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="relative aspect-[16/10] bg-stone-100">
                  <Image
                    src={blog.imageUrl}
                    alt={blog.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">{blog.category}</span>
                  </div>
                  <h3 className="font-serif text-lg text-stone-800 group-hover:text-amber-700 transition line-clamp-2">
                    {blog.title}
                  </h3>
                  <p className="text-sm text-stone-600 mt-2 line-clamp-2">{blog.summary}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-stone-500">
                    <span>{blog.authorName}</span>
                    <span>{new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-stone-300 text-stone-700 rounded hover:border-amber-600 hover:text-amber-700 transition"
          >
            View All Articles
          </Link>
        </div>
      </div>
    </section>
  );
}