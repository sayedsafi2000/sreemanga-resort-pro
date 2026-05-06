import Image from 'next/image';
import { isLocalPublicImagePath } from '@/lib/spot-image';
import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt: string;
  /** Parent must be `relative` with explicit size when true. */
  fill: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Explore spot photos come from the CMS (any HTTPS host, data URLs, or local `/…` paths).
 * `next/image` is only used for same-origin public files; everything else uses `<img>` so uploads always show.
 */
export default function SpotCoverImage({ src, alt, fill, className, sizes, priority }: Props) {
  if (isLocalPublicImagePath(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(fill && 'absolute inset-0 h-full w-full object-cover', className)}
    />
  );
}
