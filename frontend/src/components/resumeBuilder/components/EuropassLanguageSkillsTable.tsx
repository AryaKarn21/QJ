import React from 'react';

export interface FormattedLanguageItem {
  language: string;
  listening: string;
  reading: string;
  spokenProduction: string;
  spokenInteraction: string;
  writing: string;
}

export interface EuropassLanguageSkillsTableProps {
  motherTongue?: string;
  languages: FormattedLanguageItem[];
  title?: string;
  motherTongueLabel?: string;
  understandingLabel?: string;
  listeningLabel?: string;
  readingLabel?: string;
  speakingLabel?: string;
  spokenProductionLabel?: string;
  spokenInteractionLabel?: string;
  writingLabel?: string;
  levelsLegend?: string;
}

export const EuropassLanguageSkillsTable: React.FC<EuropassLanguageSkillsTableProps> = ({
  motherTongue,
  languages,
  title = 'LANGUAGE SKILLS',
  motherTongueLabel = 'Mother tongue(s)',
  understandingLabel = 'UNDERSTANDING',
  listeningLabel = 'Listening',
  readingLabel = 'Reading',
  speakingLabel = 'SPEAKING',
  spokenProductionLabel = 'Spoken production',
  spokenInteractionLabel = 'Spoken interaction',
  writingLabel = 'WRITING',
  levelsLegend = 'Levels: A1 and A2: Basic user - B1 and B2: Independent user - C1 and C2: Proficient user',
}) => {
  if (!motherTongue && languages.length === 0) return null;

  return (
    <section className="break-inside-avoid">
      {/* 1. Header with bullet dot and full-width line */}
      <div className="flex items-center gap-1.5 border-b border-slate-300 pb-0.5 mb-1.5">
        <span className="text-slate-400 text-[10px]">●</span>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          {title}
        </h2>
      </div>

      {/* 2. Mother Tongue Row with horizontal divider */}
      {motherTongue && (
        <div className="text-[11px] text-slate-700 border-b border-slate-300 pb-1.5 mb-2">
          <span className="text-slate-600">{motherTongueLabel}:</span>{' '}
          <span className="font-bold text-slate-900 uppercase">{motherTongue}</span>
        </div>
      )}

      {/* 3. CEFR 5-Skill Language Matrix Table */}
      {languages.length > 0 && (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              {/* Top Header Row: UNDERSTANDING | SPEAKING | WRITING */}
              <tr className="border-b border-slate-300">
                <th className="w-[22%] py-1"></th>
                <th
                  colSpan={2}
                  className="w-[30%] py-1 text-center font-bold text-slate-900 text-[10px] tracking-wide uppercase"
                >
                  {understandingLabel}
                </th>
                <th
                  colSpan={2}
                  className="w-[32%] py-1 text-center font-bold text-slate-900 text-[10px] tracking-wide uppercase"
                >
                  {speakingLabel}
                </th>
                <th
                  className="w-[16%] py-1 text-center font-bold text-slate-900 text-[10px] tracking-wide uppercase"
                >
                  {writingLabel}
                </th>
              </tr>

              {/* Sub-Header Row: Listening | Reading | Spoken prod | Spoken int */}
              <tr className="border-b border-slate-300">
                <th className="py-1"></th>
                <th className="py-1 text-center font-normal text-slate-700 text-[9.5px]">
                  {listeningLabel}
                </th>
                <th className="py-1 text-center font-normal text-slate-700 text-[9.5px]">
                  {readingLabel}
                </th>
                <th className="py-1 text-center font-normal text-slate-700 text-[9.5px]">
                  {spokenProductionLabel}
                </th>
                <th className="py-1 text-center font-normal text-slate-700 text-[9.5px]">
                  {spokenInteractionLabel}
                </th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {languages.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-300 bg-slate-50/70 hover:bg-slate-100/60 transition-colors"
                >
                  <td className="py-1.5 px-3 font-bold text-slate-900 uppercase text-[10.5px]">
                    {item.language}
                  </td>
                  <td className="py-1.5 text-center font-medium text-slate-800 text-[10.5px]">
                    {item.listening}
                  </td>
                  <td className="py-1.5 text-center font-medium text-slate-800 text-[10.5px]">
                    {item.reading}
                  </td>
                  <td className="py-1.5 text-center font-medium text-slate-800 text-[10.5px]">
                    {item.spokenProduction}
                  </td>
                  <td className="py-1.5 text-center font-medium text-slate-800 text-[10.5px]">
                    {item.spokenInteraction}
                  </td>
                  <td className="py-1.5 text-center font-medium text-slate-800 text-[10.5px]">
                    {item.writing}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 4. Footnote legend */}
          <p className="text-[9.5px] italic text-slate-500 mt-1.5">
            {levelsLegend}
          </p>
        </div>
      )}
    </section>
  );
};
