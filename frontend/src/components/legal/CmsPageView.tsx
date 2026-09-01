import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { getPublicCmsPage, type CmsGenericPage } from '../../api/cmsPublicApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';

/**
 * Public renderer for admin-authored generic CMS pages (the "Pages" tab
 * in CmsHub.tsx — About Us, landing pages, etc.), mounted at /p/:slug.
 * Distinct from LegalPage.tsx, which serves the three fixed legal slugs —
 * this serves arbitrary admin-created pages and treats an unpublished/
 * nonexistent slug as a genuine 404, not a "coming soon" placeholder.
 */
export function CmsPageView() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState<CmsGenericPage | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setNotFound(false);
    getPublicCmsPage(slug)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-800">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        {loading ? (
          <div className="flex items-center gap-2 py-16 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-600">
            Couldn't load this page right now. Please try again later.
          </div>
        ) : notFound || !page ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <FileText size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">This page doesn't exist or hasn't been published yet.</p>
          </div>
        ) : (
          <>
            <h1 className="mb-6 text-3xl font-bold text-gray-900">{page.title}</h1>
            {page.featuredImage && (
              <img
                src={resolveMediaUrl(page.featuredImage)}
                alt={page.title}
                className="mb-6 h-64 w-full rounded-lg object-cover"
              />
            )}
            <div
              className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </>
        )}
      </div>
    </div>
  );
}
