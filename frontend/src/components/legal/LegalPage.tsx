import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { getLegalPage } from '../../api/legalApi';

interface LegalPageProps {
  slug: string;
  /** Shown in the header always, and as the fallback title if the CMS page has no title yet. */
  defaultTitle: string;
  /**
   * Rendered only when the CMS page hasn't been published yet (empty/
   * draft-placeholder) — lets a page that already had real static content
   * (Privacy Policy) keep showing it unchanged for a fresh install, while
   * still preferring real admin-authored CMS content the moment an admin
   * saves one. Omit for pages with no prior static content (Terms,
   * Community Guidelines) so they show an honest empty state instead.
   */
  fallback?: React.ReactNode;
}

/**
 * Shared renderer for every admin-authored legal/static page (Privacy
 * Policy, Terms of Service, Community Guidelines) — backed by the existing
 * `Page` model / `GET /api/cms/pages/:slug` (see
 * backend/controllers/cmsController.js). One component instead of a
 * hand-copied page per slug, consistent with how the admin CMS's LegalTab
 * already treats these as one interchangeable "page" concept.
 */
export function LegalPage({ slug, defaultTitle, fallback }: LegalPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState<{ title: string; content: string; isDraftPlaceholder?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getLegalPage(slug)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hasRealContent = !!page?.content?.trim() && !page.isDraftPlaceholder;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-800">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">{page?.title || defaultTitle}</h1>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-600">
            Couldn't load this page right now. Please try again later.
          </div>
        ) : hasRealContent ? (
          <div
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: page!.content }}
          />
        ) : fallback ? (
          fallback
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <FileText size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">This page hasn't been published yet. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
