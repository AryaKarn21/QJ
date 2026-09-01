import React, { useEffect, useState } from 'react';
import { Globe, Building2, Users2, MapPin, Calendar } from 'lucide-react';
import { fetchCompanyAbout } from '../../api/communityApi';
import type { CompanyAbout as CompanyAboutData } from '../../api/communityApi';

export function CompanyAbout({ companyId }: { companyId: string }) {
  const [about, setAbout] = useState<CompanyAboutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyAbout(companyId)
      .then(setAbout)
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <div className="py-8 text-center text-sm text-gray-400">Loading…</div>;
  }
  if (!about) {
    return null;
  }

  const rows = [
    { icon: Building2, label: 'Industry', value: about.industryType },
    { icon: Users2, label: 'Company size', value: about.companySize },
    { icon: MapPin, label: 'Location', value: about.address },
    {
      icon: Calendar,
      label: 'Founded',
      value: about.establishedDate ? new Date(about.establishedDate).getFullYear().toString() : undefined,
    },
  ].filter((r) => r.value);

  const websiteHref = about.website
    ? (about.website.startsWith('http') ? about.website : 'https://' + about.website)
    : '';

  // Built with createElement instead of a JSX <a> tag on purpose — avoids a
  // copy/paste issue where the opening tag kept getting dropped.
  const websiteLink = about.website
    ? React.createElement(
        'a',
        {
          href: websiteHref,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline',
        },
        React.createElement(Globe, { size: 13 }),
        ' ',
        about.website
      )
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      {about.description ? (
        <p className="mb-5 text-sm leading-relaxed text-gray-600">{about.description}</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-5">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-start gap-2.5 text-sm">
                <Icon size={15} className="mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{row.label}</p>
                  <p className="font-medium text-gray-800">{row.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {websiteLink}

      {!about.description && rows.length === 0 && !about.website ? (
        <p className="text-sm text-gray-400">This company hasn't added an about section yet.</p>
      ) : null}
    </div>
  );
}