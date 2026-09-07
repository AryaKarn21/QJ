import React from 'react';

/**
 * Validates a user-entered resume link before it's ever rendered as a real
 * `href`. Every link field across the resume builder (Experience, Education,
 * Projects, Certifications, Internships, Trainings, Achievements,
 * Publications, Scholarships, Positions of Responsibility, Volunteering,
 * References, Custom Sections) is free-text the user typed themselves — this
 * is the one place that decides what's safe to hand to the browser as an
 * anchor's `href`, instead of every template re-deriving that judgment call.
 *
 * Only `http:`/`https:` survive — `javascript:`, `data:`, `vbscript:`, and
 * anything else are rejected outright, which is what actually matters for
 * safety (an `<a href="javascript:...">` executes on click). A bare domain
 * without a protocol (very common — someone types "linkedin.com/in/me")
 * gets `https://` prepended once, matching how a browser address bar treats
 * the same input, rather than being silently dropped.
 */
export function sanitizeResumeLink(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

interface ResumeLinkProps {
  href?: string | null;
  /** Short, professional label — never the raw URL (e.g. "View Project", not "https://..."). */
  label?: string;
  /** Theme accent color (resumes use a per-theme inline color, not a fixed Tailwind class). */
  color?: string;
  className?: string;
}

/**
 * Renders nothing if the link doesn't survive `sanitizeResumeLink` — every
 * call site can do `<ResumeLink href={entry.link} label="View Project" />`
 * unconditionally without its own `{entry.link && ...}` guard, and never
 * shows a bare, unstyled, wall-of-URL-text like the one pre-existing
 * unlabeled link render in ModernTemplate did.
 */
export const ResumeLink: React.FC<ResumeLinkProps> = ({ href, label = 'View link', color, className = '' }) => {
  const safeHref = sanitizeResumeLink(href);
  if (!safeHref) return null;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[11px] font-medium underline-offset-2 hover:underline ${className}`}
      style={color ? { color } : undefined}
    >
      {label}
    </a>
  );
};

export default ResumeLink;
