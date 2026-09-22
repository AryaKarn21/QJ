import React from 'react';

export interface FormattedLanguageItem {
  language: string;
  level?: string;
  cefrLevel?: string;
  listening?: string;
  reading?: string;
  spokenProduction?: string;
  spokenInteraction?: string;
  writing?: string;
}

export interface EuropassLanguageSkillsTableProps {
  motherTongue?: string;
  languages: FormattedLanguageItem[];
  title?: string;
  motherTongueLabel?: string;
}

export const EuropassLanguageSkillsTable: React.FC<EuropassLanguageSkillsTableProps> = ({
  motherTongue,
  languages,
  title = 'LANGUAGE SKILLS',
  motherTongueLabel = 'Mother tongue(s)',
}) => {
  if (!motherTongue && (!languages || languages.length === 0)) return null;

  return (
    <section className="break-inside-avoid">
      {/* 1. Header with bullet dot and subtle thin divider line */}
      <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
        <span className="text-slate-500 text-[10px]">●</span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          {title}
        </h2>
      </div>

      {/* 2. Mother Tongue Row */}
      {motherTongue && (
        <div className="text-[10.5px] text-slate-700 pb-1 mb-1.5">
          <span className="text-slate-600">{motherTongueLabel}:</span>{' '}
          <span className="font-bold text-slate-900 uppercase">{motherTongue}</span>
        </div>
      )}

      {/* 3. Streamlined Language & CEFR Level Compact Table */}
      {languages.length > 0 && (
        <div className="w-full max-w-md">
          <table className="w-full text-left text-[10.5px] border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-800">
                <th className="py-1 font-bold tracking-wide w-2/3">Language</th>
                <th className="py-1 font-bold tracking-wide w-1/3">CEFR Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {languages.map((item, idx) => {
                const effectiveLevel =
                  item.cefrLevel ||
                  item.level ||
                  item.listening ||
                  item.reading ||
                  'A2';

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-1 text-slate-900 font-medium">
                      {item.language}
                    </td>
                    <td className="py-1 text-slate-700 font-semibold uppercase">
                      {effectiveLevel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default EuropassLanguageSkillsTable;
