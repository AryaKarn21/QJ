import React, { useEffect, useState } from 'react';
import { Globe, Building2, Users2, MapPin, Calendar, Linkedin, Target, Heart, Gift } from 'lucide-react';
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

  // Built with createElement instead of a JSX <a> tag on purpose — avoids a
  // copy/paste issue where the opening tag kept getting dropped.
  const linkRow = (href: string, Icon: typeof Globe, label: string) =>
    React.createElement(
      'a',
      {
        key: label,
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline',
      },
      React.createElement(Icon, { size: 13 }),
      ' ',
      label
    );

  const links = [
    about.website ? linkRow(about.website.startsWith('http') ? about.website : 'https://' + about.website, Globe, about.website) : null,
    about.socialLinks?.linkedin ? linkRow(about.socialLinks.linkedin, Linkedin, 'LinkedIn') : null,
  ].filter(Boolean);

  const hasNothing =
    !about.description && rows.length === 0 && links.length === 0 &&
    !about.mission && !about.culture &&
    (!about.companyLocations || about.companyLocations.length === 0) &&
    (!about.companyBenefits || about.companyBenefits.length === 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card space-y-5">
      {about.headline ? (
        <p className="text-sm font-medium text-gray-700">{about.headline}</p>
      ) : null}

      {about.description ? (
        <p className="text-sm leading-relaxed text-gray-600">{about.description}</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {links.length > 0 ? <div className="flex flex-wrap gap-4">{links}</div> : null}

      {about.mission ? (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Target size={13} className="text-primary" /> Mission
          </p>
          <p className="text-sm leading-relaxed text-gray-600">{about.mission}</p>
        </div>
      ) : null}

      {about.culture ? (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Heart size={13} className="text-primary" /> Culture
          </p>
          <p className="text-sm leading-relaxed text-gray-600">{about.culture}</p>
        </div>
      ) : null}

      {about.companyLocations && about.companyLocations.length > 0 ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <MapPin size={13} className="text-primary" /> Office Locations
          </p>
          <div className="flex flex-wrap gap-2">
            {about.companyLocations.map((loc) => (
              <span key={loc} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-gray-700">{loc}</span>
            ))}
          </div>
        </div>
      ) : null}

      {about.companyBenefits && about.companyBenefits.length > 0 ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Gift size={13} className="text-primary" /> Benefits
          </p>
          <div className="flex flex-wrap gap-2">
            {about.companyBenefits.map((b) => (
              <span key={b} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{b}</span>
            ))}
          </div>
        </div>
      ) : null}

      {hasNothing ? (
        <p className="text-sm text-gray-400">This company hasn't added an about section yet.</p>
      ) : null}
    </div>
  );
}