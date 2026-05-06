import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/components/ui/Container';
import { getBlogs } from '@/lib/resort-api';

export const metadata: Metadata = {
  title: 'Travel Blog - Stories from Sreemangal',
  description: 'Read travel guides, nature tips, and local food recommendations from Nirjon Nature\'s Hideout in Sreemangal, Sylhet.',
};

export default async function BlogsPage() {
  const blogs = await getBlogs();

  return (
    <div className="bg-stone-50 pb-20 pt-10 sm:pt-14">
      <Container>
        <div className="text-center mb-12">
          <p className="text-amber-700 font-medium mb-2">Travel Guide · Blog</p>
          <h1 className="text-4xl md:text-5xl font-serif text-stone-800"> Stories from Sreemangal</h1>
          <p className="text-stone-600 mt-3 max-w-2xl mx-auto">
            Discover nature trails, tea garden tours, local flavors, and hidden gems around the tea capital of Bangladesh.
          </p>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-500">No blog posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link key={blog.id} href={`/blogs/${blog.slug}`} className="group block">
                <article className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition h-full flex flex-col">
                  <div className="relative aspect-[16/10] bg-stone-100 shrink-0">
                    <Image
                      src={blog.imageUrl}
                      alt={blog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded">{blog.category}</span>
                      {blog.isFeatured && (
                        <span className="px-2 py-1 bg-amber-500 text-white rounded text-xs">Featured</span>
                      )}
                    </div>
                    <h2 className="font-serif text-xl text-stone-800 group-hover:text-amber-700 transition">
                      {blog.title}
                    </h2>
                    <p className="text-stone-600 mt-2 line-clamp-3 flex-1">{blog.summary}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100 text-sm text-stone-500">
                      <span>{blog.authorName}</span>
                      <span>{new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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