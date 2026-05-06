import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Container from '@/components/ui/Container';
import { getBlogBySlug } from '@/lib/resort-api';
import { siteUrl } from '@/lib/site';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) {
    return { title: 'Blog Not Found' };
  }
  return {
    title: `${blog.title} | Nirjon Nature's Hideout Blog`,
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
  const blogs = await getBlogBySlug('');
  return [];
}

export default async function BlogPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="bg-white pb-20 pt-10 sm:pt-14">
      <Container>
        <article className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4 text-sm">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full">{blog.category}</span>
              <span className="text-stone-500">
                {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-stone-900">{blog.title}</h1>
            <p className="text-stone-600 mt-4 text-lg">{blog.summary}</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-stone-500">
              <span>By {blog.authorName}</span>
              {blog.tags.length > 0 && (
                <>
                  <span>·</span>
                  <div className="flex gap-2">
                    {blog.tags.map((tag) => (
                      <span key={tag} className="text-amber-700">#{tag}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative aspect-[16/9] w-full bg-stone-100 rounded-lg overflow-hidden mb-10">
            <Image
              src={blog.imageUrl}
              alt={blog.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="prose prose-stone prose-lg max-w-none">
            {blog.content.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-stone-200">
            <p className="text-stone-600 text-center">
              Enjoyed this article? <br />
              <a href="/contact" className="text-amber-700 hover:underline">
                Contact us
              </a>{' '}
              to book your stay at Nirjon Nature's Hideout and explore Sreemangal yourself!
            </p>
          </div>
        </article>
      </Container>
    </div>
  );
}