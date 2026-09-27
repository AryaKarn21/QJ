import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { RELATED_POLICIES } from './relatedPolicies';

interface TocItem {
  id: string;
  text: string;
}

interface PolicyPageShellProps {
  title: string;
  description?: string;
  content: string;
  updatedAt?: string;
  version?: number;
  currentPath: string;
  featuredImage?: React.ReactNode;
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Shared visual shell for every public Legal & Policies page (both the
 * legacy 3-slug LegalPage.tsx and the generic CmsPageView.tsx render into
 * this once real, published content is available — their loading/error/
 * not-yet-published states are untouched, this only owns the "ready"
 * branch). Adds a desktop table-of-contents sidebar with scroll-spy, a
 * mobile "On this page" disclosure, a Last Updated/Version row, a Related
 * Policies row, and a Back to Top button — none of which existed before.
 */
export function PolicyPageShell({
  title,
  description,
  content,
  updatedAt,
  version,
  currentPath,
  featuredImage,
}: PolicyPageShellProps) {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Extract h2/h3 headings from the rendered HTML content, assign stable
  // ids (for anchor links + scroll-spy), and give them breathing room from
  // the top edge when scrolled to.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLElement[];
    const seen = new Set<string>();
    const items: TocItem[] = headings.map((heading, idx) => {
      const text = heading.textContent?.trim() || `Section ${idx + 1}`;
      let id = slugify(text) || `section-${idx + 1}`;
      while (seen.has(id)) id = `${id}-${idx + 1}`;
      seen.add(id);
      heading.id = id;
      heading.style.scrollMarginTop = '96px';
      return { id, text };
    });
    setTocItems(items);
  }, [content]);

  // Scroll-spy: highlight whichever heading is currently nearest the top
  // of the viewport.
  useEffect(() => {
    if (tocItems.length === 0) return;
    const headingEls = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    );
    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocItems]);

  // Back to Top visibility.
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToHeading = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const relatedPolicies = RELATED_POLICIES.filter((p) => p.path !== currentPath);

  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  // Clean any legacy demo/placeholder blockquote warnings so live users get a clean professional document
  const cleanedContent = content.replace(/<blockquote[\s\S]*?DEMO[\s\S]*?<\/blockquote>/gi, '').trim();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Legal Page</p>
      <h1 className="mb-3 text-3xl font-bold text-gray-900 break-words">{title}</h1>
      {description && <p className="mb-4 max-w-3xl text-base text-gray-600 break-words">{description}</p>}

      {(lastUpdated || version) && (
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          {lastUpdated && <span>Last Updated: {lastUpdated}</span>}
          {lastUpdated && version ? <span aria-hidden="true">&middot;</span> : null}
          {version && <span>Version {version}</span>}
        </div>
      )}

      {featuredImage}

      {tocItems.length > 0 && (
        <details className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">On this page</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {tocItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={scrollToHeading(item.id)} className="text-gray-600 hover:text-primary">
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className={tocItems.length > 0 ? 'lg:grid lg:grid-cols-[220px_1fr] lg:gap-10' : ''}>
        {tocItems.length > 0 && (
          <aside className="hidden lg:block">
            <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto border-l border-gray-200 pl-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">On this page</p>
              <ul className="space-y-2 text-sm">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={scrollToHeading(item.id)}
                      className={`block border-l-2 pl-3 -ml-4 transition-colors ${
                        activeId === item.id
                          ? 'border-primary font-medium text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}

        <div
          ref={contentRef}
          className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-orange-600 prose-a:font-semibold hover:prose-a:underline prose-li:my-1 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: cleanedContent || content }}
        />
      </div>

      {relatedPolicies.length > 0 && (
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Related Policies</p>
          <div className="flex flex-wrap gap-2">
            {relatedPolicies.map((p) => (
              <button
                key={p.path}
                type="button"
                onClick={() => navigate(p.path)}
                className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}

export default PolicyPageShell;
