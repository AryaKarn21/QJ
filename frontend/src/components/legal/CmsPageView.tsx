import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { getPublicCmsPage } from '../../api/cmsPublicApi';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { SkeletonText, SkeletonBlock, SkeletonParagraph } from '../ui/Skeleton';
import { PolicyPageShell } from './PolicyPageShell';

/**
 * Public renderer for admin-authored generic CMS pages (the "Pages" tab
 * in CmsHub.tsx — About Us, landing pages, etc.), mounted at /p/:slug.
 * Distinct from LegalPage.tsx, which serves the three original fixed legal
 * slugs (gated by the legacy ALLOWED_PAGE_SLUGS endpoint) — this serves any
 * published Page by slug via the generic `/pages/view/:slug` endpoint, so
 * it also backs the fixed public routes for the 8 newer Legal & Policies
 * types (job-seeker-rules, cookie-policy, etc. — see App.tsx), passed in
 * via `slugProp` instead of the URL param those use.
 * Treats an unpublished/nonexistent slug as a genuine 404, not a "coming
 * soon" placeholder.
 */
export function CmsPageView({ slugProp }: { slugProp?: string } = {}) {
  const location = useLocation();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugProp ?? slugParam;

  const { data: page, isLoading: loading, isError, error } = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: () => getPublicCmsPage(slug as string),
    enabled: !!slug,
    retry: false,
  });

  const notFound = isError && (error as { response?: { status?: number } })?.response?.status === 404;
  const genericError = isError && !notFound;

  if (!loading && !genericError && !notFound && page) {
    return (
      <div className="flex min-h-screen flex-col bg-white text-gray-800">
        <PolicyPageShell
          title={page.title}
          description={page.shortDescription}
          content={page.content}
          updatedAt={page.updatedAt}
          version={page.version}
          currentPath={location.pathname}
          featuredImage={
            page.featuredImage ? (
              <img
                src={resolveMediaUrl(page.featuredImage)}
                alt={page.title}
                className="mb-6 h-64 w-full rounded-lg object-cover"
              />
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-800">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        {loading ? (
          <div aria-busy="true" aria-label="Loading page">
            <SkeletonText width="w-2/3" height="h-9" className="mb-6" />
            <SkeletonBlock className="mb-6 h-64 w-full" />
            <SkeletonParagraph lines={6} />
          </div>
        ) : genericError ? (
          <div className="rounded-lg border border-dashed border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-600">
            Couldn't load this page right now. Please try again later.
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
            <FileText size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">This page doesn't exist or hasn't been published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
