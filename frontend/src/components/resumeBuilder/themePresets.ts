export interface ThemePreset {
  id: string;
  name: string;
  accent: string; // used for headings, section titles, accents
  accentSoft: string; // lighter tint, used for backgrounds/dividers
  text: string; // body text color
  fontHeading: string;
  fontBody: string;
}

/**
 * Each preset here, combined with each layout in `templates/`, produces one
 * visually distinct template. 3 layouts × 24 themes = 72 selectable
 * templates from a small, maintainable set of components — the realistic
 * version of "1000+ templates" (hand-building 1000+ separate files isn't
 * maintainable; layout × theme composition is how Canva/Naukri do it).
 * Add more entries here any time to grow the count — no new components needed.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'violet',
    name: 'Violet',
    accent: '#7C3AED',
    accentSoft: '#EDE9FE',
    text: '#1E1B2E',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'slate',
    name: 'Slate',
    accent: '#334155',
    accentSoft: '#F1F5F9',
    text: '#0F172A',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    accent: '#059669',
    accentSoft: '#D1FAE5',
    text: '#122019',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    accent: '#B91C1C',
    accentSoft: '#FEE2E2',
    text: '#1F1315',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'navy',
    name: 'Navy',
    accent: '#1E3A8A',
    accentSoft: '#DBEAFE',
    text: '#0B1220',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'charcoal',
    name: 'Charcoal (ATS-safe)',
    accent: '#111827',
    accentSoft: '#F3F4F6',
    text: '#111827',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'amber',
    name: 'Amber',
    accent: '#B45309',
    accentSoft: '#FEF3C7',
    text: '#241A0A',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'teal',
    name: 'Teal',
    accent: '#0F766E',
    accentSoft: '#CCFBF1',
    text: '#0C211E',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    accent: '#4338CA',
    accentSoft: '#E0E7FF',
    text: '#1A1735',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'rose',
    name: 'Rose',
    accent: '#BE185D',
    accentSoft: '#FCE7F3',
    text: '#26121C',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'forest',
    name: 'Forest',
    accent: '#166534',
    accentSoft: '#DCFCE7',
    text: '#0F1F14',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'burgundy',
    name: 'Burgundy',
    accent: '#7F1D1D',
    accentSoft: '#FEE2E2',
    text: '#1F1010',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'steel-blue',
    name: 'Steel Blue',
    accent: '#0369A1',
    accentSoft: '#E0F2FE',
    text: '#0C1E29',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'olive',
    name: 'Olive',
    accent: '#4D7C0F',
    accentSoft: '#ECFCCB',
    text: '#1A2210',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'plum',
    name: 'Plum',
    accent: '#86198F',
    accentSoft: '#FAE8FF',
    text: '#230E26',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    accent: '#C2410C',
    accentSoft: '#FFEDD5',
    text: '#271208',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    accent: '#0891B2',
    accentSoft: '#CFFAFE',
    text: '#0B2027',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    accent: '#44403C',
    accentSoft: '#F5F5F4',
    text: '#1C1917',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'mustard',
    name: 'Mustard',
    accent: '#A16207',
    accentSoft: '#FEF9C3',
    text: '#241D08',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    accent: '#1D4ED8',
    accentSoft: '#DBEAFE',
    text: '#0B1530',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'maroon',
    name: 'Maroon',
    accent: '#9F1239',
    accentSoft: '#FFE4E6',
    text: '#240A12',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'sage',
    name: 'Sage',
    accent: '#3F6212',
    accentSoft: '#F7FEE7',
    text: '#182008',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    accent: '#1E1B4B',
    accentSoft: '#E0E7FF',
    text: '#0A0920',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'coral',
    name: 'Coral',
    accent: '#9A3412',
    accentSoft: '#FFF7ED',
    text: '#271409',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  // ── Added for the base-template × theme generator (registry.ts) — pushes
  // the combined registry past 1500 selectable templates. Same shape/rules
  // as every preset above: pick a genuinely distinct accent, not a near-
  // duplicate of an existing hue.
  {
    id: 'cerulean',
    name: 'Cerulean',
    accent: '#0284C7',
    accentSoft: '#E0F2FE',
    text: '#0C2233',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'wine',
    name: 'Wine',
    accent: '#6D0F2B',
    accentSoft: '#FBE4EA',
    text: '#22050D',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'moss',
    name: 'Moss',
    accent: '#365314',
    accentSoft: '#ECFCCB',
    text: '#131F08',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'denim',
    name: 'Denim',
    accent: '#3B5998',
    accentSoft: '#E8EDF9',
    text: '#131B2E',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'copper',
    name: 'Copper',
    accent: '#B45309',
    accentSoft: '#FEF0DC',
    text: '#2B1607',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    accent: '#A21CAF',
    accentSoft: '#FAE8FF',
    text: '#280A2A',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'pine',
    name: 'Pine',
    accent: '#134E4A',
    accentSoft: '#CCFBF1',
    text: '#08211F',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'brick',
    name: 'Brick',
    accent: '#B91C2E',
    accentSoft: '#FEE7E9',
    text: '#280A0D',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    accent: '#0E7490',
    accentSoft: '#D7F2F8',
    text: '#0A2128',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'clay',
    name: 'Clay',
    accent: '#92400E',
    accentSoft: '#FCE9D3',
    text: '#291505',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'iris',
    name: 'Iris',
    accent: '#5B21B6',
    accentSoft: '#EDE4FE',
    text: '#1B0E33',
    fontHeading: 'Georgia, serif',
    fontBody: 'Inter, sans-serif',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    accent: '#18181B',
    accentSoft: '#F4F4F5',
    text: '#0A0A0B',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
  },
];

// ── Independent font-family customization ───────────────────────────────────
//
// Every theme above bakes in ONE font pairing (only 2 combinations exist
// across all 36 themes: Georgia+Inter or Inter+Inter) — color and
// typography were never separable. This lets a user pick typography
// independently of color, the way real resume builders (and the request)
// expect "font customization" to work, without touching the ~55 template
// files that already call `getTheme(resume.theme)` — see below.
export interface FontFamilyPreset {
  id: string;
  name: string;
  fontHeading: string;
  fontBody: string;
  // Which built-in jsPDF font family this maps to for the ATS-safe text
  // PDF export (jsPDF only ships helvetica/times/courier) — see
  // utils/pdfGenerator.ts.
  pdfFont: 'helvetica' | 'times' | 'courier';
}

export const FONT_FAMILY_PRESETS: FontFamilyPreset[] = [
  {
    id: 'theme-default',
    name: "Theme default",
    fontHeading: '',
    fontBody: '',
    pdfFont: 'helvetica',
  },
  {
    id: 'classic-serif',
    name: 'Classic Serif',
    fontHeading: 'Georgia, "Times New Roman", serif',
    fontBody: 'Georgia, "Times New Roman", serif',
    pdfFont: 'times',
  },
  {
    id: 'modern-sans',
    name: 'Modern Sans',
    fontHeading: 'Inter, Helvetica, Arial, sans-serif',
    fontBody: 'Inter, Helvetica, Arial, sans-serif',
    pdfFont: 'helvetica',
  },
  {
    id: 'elegant-mix',
    name: 'Elegant (Serif headings)',
    fontHeading: 'Georgia, "Times New Roman", serif',
    fontBody: 'Inter, Helvetica, Arial, sans-serif',
    pdfFont: 'times',
  },
  {
    id: 'structured-mix',
    name: 'Structured (Sans headings)',
    fontHeading: 'Inter, Helvetica, Arial, sans-serif',
    fontBody: 'Georgia, "Times New Roman", serif',
    pdfFont: 'helvetica',
  },
  {
    id: 'technical-mono',
    name: 'Technical Mono',
    fontHeading: '"Courier New", Courier, monospace',
    fontBody: '"Courier New", Courier, monospace',
    pdfFont: 'courier',
  },
];

export function getFontFamilyPreset(id?: string | null): FontFamilyPreset {
  return FONT_FAMILY_PRESETS.find((f) => f.id === id) || FONT_FAMILY_PRESETS[0];
}

// `fontFamilyId` is the resume-level override (see Resume.fontFamily) —
// 'theme-default' or unset leaves the theme's own font pairing untouched,
// any other id replaces fontHeading/fontBody on the returned object.
// Every template calls `getTheme(resume.theme, resume.fontFamily)` and
// reads `.fontHeading`/`.fontBody` off the result, so this one function is
// the single point that makes an override apply everywhere.
export function getTheme(id: string, fontFamilyId?: string | null): ThemePreset {
  const base = THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
  if (!fontFamilyId || fontFamilyId === 'theme-default') return base;
  const preset = getFontFamilyPreset(fontFamilyId);
  return { ...base, fontHeading: preset.fontHeading, fontBody: preset.fontBody };
}