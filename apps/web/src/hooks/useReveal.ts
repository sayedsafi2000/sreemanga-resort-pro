'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

interface UseRevealOptions extends IntersectionObserverInit {
  /** How far below the viewport edge before triggering (positive = earlier) */
  rootMargin?: string;
}

/**
 * Returns a ref to attach to any element, and `visible` which flips to `true`
 * once the element scrolls into view. Triggers only once.
 *
 * Usage:
 *   const { ref, visible } = useReveal();
 *   <div ref={ref} className={`reveal ${visible ? 'visible' : ''}`} />
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options?: UseRevealOptions
): { ref: RefObject<T>; visible: boolean } {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -50px 0px',
        ...options,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, options]);

  return { ref, visible };
}

/**
 * Like useReveal but tracks multiple children — useful when you need
 * per-element delayed stagger driven entirely by CSS `transition-delay`.
 * Attach the returned `containerRef` to the wrapper; all children
 * will receive `visible` at once and stagger via CSS delay classes.
 */
export function useRevealGroup<T extends HTMLElement = HTMLElement>(
  options?: UseRevealOptions
): { ref: RefObject<T>; visible: boolean } {
  return useReveal<T>({ threshold: 0.05, rootMargin: '0px 0px -40px 0px', ...options });
}
