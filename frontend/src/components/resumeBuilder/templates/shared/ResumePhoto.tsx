import React from 'react';

export type PhotoShape = 'circle' | 'square';

interface ResumePhotoProps {
  src?: string | null;
  alt?: string;
  shape?: PhotoShape;
  size?: number; // px, square box
  className?: string;
}

/**
 * Shared photo element used by every photo-capable template, so photo
 * sizing/shape/`object-cover` behavior is consistent across the whole
 * registry instead of each template hand-rolling its own <img> classes.
 * Renders nothing when there's no photo — callers that lay the header out
 * with flex (photo + text side-by-side) automatically collapse to a
 * single, full-width text column with no awkward empty gap, since there's
 * simply no second flex child to reserve space for.
 */
export const ResumePhoto: React.FC<ResumePhotoProps> = ({
  src,
  alt = 'Profile photo',
  shape = 'circle',
  size = 88,
  className = '',
}) => {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={`shrink-0 object-cover ${shape === 'circle' ? 'rounded-full' : 'rounded-md'} ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default ResumePhoto;
