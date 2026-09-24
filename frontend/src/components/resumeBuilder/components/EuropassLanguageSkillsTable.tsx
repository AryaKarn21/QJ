import React from 'react';

// Same restrained premium palette as RomaniaProfessionalTemplate.tsx (the
// primary consumer of this shared table) — kept local rather than imported
// since this component has no other dependency on that template and other
// consumers (e.g. RomaniaStructuredTemplate) should get the same look.
const INK = '#1F2937';
const SLATE = '#4B5563';
const GOLD = '#B08D57';
const HAIRLINE = '#D9D9D9';
const PANEL = '#F7F7F5';

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
  if (!motherTongue && (!languages || languages.length === 0)) return null;

  return (
    <section className="break-inside-avoid">
      {/* 1. Header with bullet dot and full-width divider — same design
          system as every other SectionHeading in the consuming templates. */}
      <div className="flex items-center gap-2 border-b pb-2 mb-3" style={{ borderColor: HAIRLINE, breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
        <span className="h-[5px] w-[5px] rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.12em]" style={{ color: INK }}>
          {title}
        </h2>
      </div>

      {/* 2. Mother Tongue Row with subtle divider */}
      {motherTongue && (
        <div className="text-[10.5px] pb-1.5 mb-1.5 border-b" style={{ color: SLATE, borderColor: HAIRLINE }}>
          <span>{motherTongueLabel}:</span>{' '}
          <span className="font-bold uppercase" style={{ color: INK }}>{motherTongue}</span>
        </div>
      )}

      {/* 3. Official Europass CEFR 5-Skill Language Matrix Table */}
      {languages.length > 0 && (
        <div className="w-full">
          <table className="w-full text-left text-[10.5px] border-collapse">
            <thead>
              {/* Top Header Row: UNDERSTANDING | SPEAKING | WRITING */}
              <tr className="border-y" style={{ borderColor: HAIRLINE }}>
                <th className="w-[20%] py-1.5"></th>
                <th
                  colSpan={2}
                  className="w-[32%] py-1.5 text-center font-bold text-[10px] tracking-wide uppercase"
                  style={{ color: INK }}
                >
                  {understandingLabel}
                </th>
                <th
                  colSpan={2}
                  className="w-[32%] py-1.5 text-center font-bold text-[10px] tracking-wide uppercase"
                  style={{ color: INK }}
                >
                  {speakingLabel}
                </th>
                <th
                  className="w-[16%] py-1.5 text-center font-bold text-[10px] tracking-wide uppercase"
                  style={{ color: INK }}
                >
                  {writingLabel}
                </th>
              </tr>

              {/* Sub-Header Row: Listening | Reading | Spoken prod | Spoken int */}
              <tr className="border-b text-[9px]" style={{ borderColor: HAIRLINE, color: SLATE }}>
                <th className="py-1"></th>
                <th className="py-1 text-center font-normal">{listeningLabel}</th>
                <th className="py-1 text-center font-normal">{readingLabel}</th>
                <th className="py-1 text-center font-normal">{spokenProductionLabel}</th>
                <th className="py-1 text-center font-normal">{spokenInteractionLabel}</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {languages.map((item, idx) => {
                const defaultLevel =
                  item.cefrLevel || item.level || 'A2';
                const listening = item.listening || defaultLevel;
                const reading = item.reading || defaultLevel;
                const spokenProduction = item.spokenProduction || defaultLevel;
                const spokenInteraction = item.spokenInteraction || defaultLevel;
                const writing = item.writing || defaultLevel;

                return (
                  <tr
                    key={idx}
                    className="border-b break-inside-avoid"
                    style={{
                      borderColor: HAIRLINE,
                      backgroundColor: idx % 2 === 0 ? PANEL : '#ffffff',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    <td className="py-2 px-2 font-bold uppercase text-[10px]" style={{ color: INK }}>
                      {item.language}
                    </td>
                    <td className="py-2 text-center font-medium text-[10px]" style={{ color: SLATE }}>
                      {listening}
                    </td>
                    <td className="py-2 text-center font-medium text-[10px]" style={{ color: SLATE }}>
                      {reading}
                    </td>
                    <td className="py-2 text-center font-medium text-[10px]" style={{ color: SLATE }}>
                      {spokenProduction}
                    </td>
                    <td className="py-2 text-center font-medium text-[10px]" style={{ color: SLATE }}>
                      {spokenInteraction}
                    </td>
                    <td className="py-2 text-center font-medium text-[10px]" style={{ color: SLATE }}>
                      {writing}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 4. Description legend matching reference */}
          <p className="text-[9px] italic mt-1.5" style={{ color: SLATE }}>
            {levelsLegend}
          </p>
        </div>
      )}
    </section>
  );
};

export default EuropassLanguageSkillsTable;
