import React from 'react';
import { Globe, ArrowRight, Eye, ShieldCheck, Sparkles } from 'lucide-react';
import { SUPPORTED_COUNTRIES, CountryCVConfig } from '../config/countryCVConfigs';

interface CountrySelectionHubProps {
  onSelectCountry: (country: CountryCVConfig) => void;
  onPreviewCountry: (country: CountryCVConfig) => void;
  selectedCountryCode?: string | null;
}

export const CountrySelectionHub: React.FC<CountrySelectionHubProps> = ({
  onSelectCountry,
  onPreviewCountry,
  selectedCountryCode,
}) => {
  return (
    <div className="mb-10 rounded-2xl border border-orange-200/80 bg-gradient-to-b from-orange-50/70 via-white to-orange-50/30 p-6 sm:p-8 shadow-xs">
      {/* Title & Subheading */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 border border-orange-200/80 px-3 py-1 text-xs font-semibold text-orange-700 mb-3 shadow-2xs">
          <Globe size={13} /> Country-Specific CV Builder
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create a CV for Your Target Country
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Choose the country where you are applying and we'll tailor the CV structure, fields and presentation for that market.
        </p>
      </div>

      {/* Country Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUPPORTED_COUNTRIES.map((country) => {
          const isSelected = selectedCountryCode?.toUpperCase() === country.countryCode;

          return (
            <div
              key={country.countryCode}
              className={`group flex flex-col justify-between rounded-2xl border bg-white p-6 transition-all duration-200 ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-400/30 shadow-md'
                  : 'border-slate-200/90 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              <div>
                {/* Header: Flag & Market Tag */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none" role="img" aria-label={country.countryName}>
                      {country.flag}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                        {country.countryName}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {country.marketType}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {country.badge}
                  </span>
                </div>

                {/* Subtitle & Description */}
                <p className="text-xs font-semibold text-orange-700 mb-1.5">
                  {country.styleSubtitle}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {country.description}
                </p>

                {/* Template count badge */}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {country.templateIds.length} {country.templateIds.length === 1 ? 'Template' : 'Templates'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400">
                    {country.features.hasCEFRGrid
                      ? 'CEFR Language Matrix'
                      : country.features.hasGulfFields
                      ? 'Recruiter Snapshot'
                      : 'Adapted Layout'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onPreviewCountry(country)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => onSelectCountry(country)}
                  className="btn-shine flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors shadow-xs shadow-orange-500/25"
                >
                  Create CV <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Authentic Guidance Notice */}
      <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
        <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
        <span>
          Formats adapted to European and Gulf employer recruitment standards. All sensitive and personal fields remain strictly optional.
        </span>
      </div>
    </div>
  );
};
