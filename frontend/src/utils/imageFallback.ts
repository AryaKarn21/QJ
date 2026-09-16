import type { SyntheticEvent } from 'react';

// Shared fallback for any <img> that renders a user-supplied URL (blog
// featured images are plain pasted links — see BlogCreate.tsx — so a
// removed/mistyped/hotlink-blocked URL is expected, not exceptional).
// Swaps the broken image out for a neutral placeholder instead of letting
// the browser show its default broken-image icon, which breaks card
// layout and aspect ratio.
export const BLOG_IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 240'%3E%3Crect width='400' height='240' fill='%23f1f5f9'/%3E%3Cg fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='140' y='84' width='120' height='90' rx='6'/%3E%3Ccircle cx='166' cy='108' r='8'/%3E%3Cpath d='M140 156l30-28 20 18 26-24 44 42'/%3E%3C/g%3E%3C/svg%3E";

export function handleImageFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null; // prevent loops if the data URI itself ever fails
  img.src = BLOG_IMAGE_FALLBACK;
}
