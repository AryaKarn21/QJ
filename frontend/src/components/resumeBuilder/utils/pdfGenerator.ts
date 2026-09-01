import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { logResumeBuild } from './aiUsageApi';
import type { Resume } from '../resumeApi';
import { getVisibleOrderedSections, sectionLabel, getCustomSectionContent, isCustomSectionId } from '../templates/shared/sections';
import { getFontFamilyPreset } from '../themePresets';

// Same combined fontScale × spacing multiplier ResumeEditor.tsx's live
// preview applies via CSS `zoom` — kept here too so the exported PDF's
// density always matches what was on screen.
const SPACING_SCALE: Record<string, number> = { compact: 0.97, standard: 1, relaxed: 1.05 };
const combinedScale = (resume: Resume) => (resume.fontScale ?? 1) * (SPACING_SCALE[resume.spacing || 'standard'] ?? 1);

export const generatePDF = async (
  elementRef: React.RefObject<HTMLDivElement>,
  fileName: string,
  templateId?: string,
  templateName?: string
) => {
  if (!elementRef.current) return;

  const canvas = await html2canvas(elementRef.current, {
    scale: 2,
    useCORS: true,
    allowTaint: true
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 295;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;

  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);

  // Fire-and-forget usage tracking — feeds the admin AI Center dashboard.
  // Never awaited/blocking: a logging failure must never affect the download.
  if (templateId) {
    logResumeBuild(templateId, templateName, 'downloaded');
  }
};

// ─────────────────────────────────────────────────────────────────────────
// ATS-safe PDF export
//
// generatePDF() above screenshots the rendered template (html2canvas) and
// embeds that screenshot as a flat image — there is no text layer at all,
// so an ATS parser (or a human copy-pasting from the PDF) sees nothing.
// This function is a second, independent export path: it draws the resume
// directly with jsPDF's native text APIs into one canonical, single-column,
// fully-selectable-text layout. It intentionally does NOT try to visually
// match whichever of the ~1,700 template variants is on screen — the goal
// is maximum machine-readability, not pixel fidelity, which is exactly
// what "ATS-safe" means. It respects the same sectionOrder/hiddenSections
// the visual editor uses (via getVisibleOrderedSections), so a section the
// user hid or reordered is hidden/reordered here too.
// ─────────────────────────────────────────────────────────────────────────

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_HEIGHT - MARGIN;

class TextPdfWriter {
  pdf: jsPDF;
  y: number;
  // Combined fontScale × spacing multiplier (same `previewScale` math as
  // ResumeEditor.tsx's live-preview zoom) — every font size AND every `y`
  // increment below is multiplied by this, so "Large + Relaxed" produces a
  // visibly roomier PDF, not just bigger text on the same tight layout.
  private scale: number;
  private font: 'helvetica' | 'times' | 'courier';

  constructor(scale = 1, font: 'helvetica' | 'times' | 'courier' = 'helvetica') {
    this.pdf = new jsPDF('p', 'mm', 'a4');
    this.y = MARGIN;
    this.scale = scale;
    this.font = font;
  }

  private ensureSpace(neededHeight: number) {
    if (this.y + neededHeight > BOTTOM_LIMIT) {
      this.pdf.addPage();
      this.y = MARGIN;
    }
  }

  spacer(mm: number) {
    this.y += mm * this.scale;
  }

  name(text: string) {
    if (!text) return;
    this.pdf.setFont(this.font, 'bold');
    this.pdf.setFontSize(18 * this.scale);
    this.ensureSpace(8 * this.scale);
    this.pdf.text(text, MARGIN, this.y);
    this.y += 8 * this.scale;
  }

  contactLine(parts: string[]) {
    const line = parts.filter(Boolean).join('   |   ');
    if (!line) return;
    this.pdf.setFont(this.font, 'normal');
    this.pdf.setFontSize(9.5 * this.scale);
    this.ensureSpace(6 * this.scale);
    const wrapped = this.pdf.splitTextToSize(line, CONTENT_WIDTH);
    wrapped.forEach((l: string) => {
      this.ensureSpace(5 * this.scale);
      this.pdf.text(l, MARGIN, this.y);
      this.y += 5 * this.scale;
    });
    this.y += 2 * this.scale;
  }

  heading(text: string) {
    this.spacer(3);
    this.ensureSpace(8 * this.scale);
    this.pdf.setFont(this.font, 'bold');
    this.pdf.setFontSize(11.5 * this.scale);
    this.pdf.text(text.toUpperCase(), MARGIN, this.y);
    this.y += 1.5 * this.scale;
    this.pdf.setDrawColor(90, 90, 90);
    this.pdf.setLineWidth(0.4);
    this.pdf.line(MARGIN, this.y, MARGIN + CONTENT_WIDTH, this.y);
    this.y += 5.5 * this.scale;
  }

  // Bold left label + right-aligned secondary text on the same line (e.g.
  // "Frontend Engineer" ... "Jan 2023 – Present"). Falls back to a single
  // wrapped line if there's no room for both.
  entryHeader(left: string, right: string) {
    this.pdf.setFont(this.font, 'bold');
    this.pdf.setFontSize(10.5 * this.scale);
    this.ensureSpace(5.5 * this.scale);
    this.pdf.text(left || '', MARGIN, this.y);
    if (right) {
      this.pdf.setFont(this.font, 'normal');
      this.pdf.setFontSize(9.5 * this.scale);
      const w = this.pdf.getTextWidth(right);
      this.pdf.text(right, MARGIN + CONTENT_WIDTH - w, this.y);
    }
    this.y += 5 * this.scale;
  }

  subLine(text: string) {
    if (!text) return;
    this.pdf.setFont(this.font, 'italic');
    this.pdf.setFontSize(9.5 * this.scale);
    this.ensureSpace(5 * this.scale);
    this.pdf.text(text, MARGIN, this.y);
    this.y += 5 * this.scale;
  }

  paragraph(text: string) {
    if (!text?.trim()) return;
    this.pdf.setFont(this.font, 'normal');
    this.pdf.setFontSize(9.8 * this.scale);
    const lines = this.pdf.splitTextToSize(text.trim(), CONTENT_WIDTH);
    lines.forEach((l: string) => {
      this.ensureSpace(4.8 * this.scale);
      this.pdf.text(l, MARGIN, this.y);
      this.y += 4.8 * this.scale;
    });
    this.y += 1.5 * this.scale;
  }

  // Splits a free-text description into bullets on newlines/•/·, same
  // convention the ATS analyzer (backend/services/atsAnalysis.service.js)
  // uses to count bullets — so what gets analyzed is what gets exported.
  bullets(description: string) {
    const lines = (description || '')
      .split(/\r?\n|•|·/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    this.pdf.setFont(this.font, 'normal');
    this.pdf.setFontSize(9.8 * this.scale);
    const bulletIndent = 4.5;
    lines.forEach((line) => {
      const wrapped = this.pdf.splitTextToSize(line, CONTENT_WIDTH - bulletIndent);
      wrapped.forEach((l: string, i: number) => {
        this.ensureSpace(4.8 * this.scale);
        if (i === 0) {
          this.pdf.text('•', MARGIN, this.y);
        }
        this.pdf.text(l, MARGIN + bulletIndent, this.y);
        this.y += 4.8 * this.scale;
      });
    });
    this.y += 1.5 * this.scale;
  }

  commaList(items: string[]) {
    if (!items.length) return;
    this.paragraph(items.join('  •  '));
  }
}

const dateRange = (start?: string, end?: string, current?: boolean) => {
  const from = start || '';
  const to = current ? 'Present' : end || '';
  return [from, to].filter(Boolean).join(' – ');
};

// One renderer per section id — mirrors SECTION_DEFS in templates/shared/sections.ts.
const SECTION_RENDERERS: Record<string, (w: TextPdfWriter, r: Resume) => void> = {
  summary: (w, r) => {
    w.heading('Professional Summary');
    w.paragraph(r.summary);
  },
  experience: (w, r) => {
    w.heading('Work Experience');
    (r.experience || []).forEach((e) => {
      w.entryHeader(`${e.role || 'Role'}${e.company ? ' — ' + e.company : ''}`, dateRange(e.startDate, e.endDate, e.current));
      if (e.location) w.subLine(e.location);
      w.bullets(e.description);
    });
  },
  internships: (w, r) => {
    w.heading('Internships');
    (r.internships || []).forEach((e) => {
      w.entryHeader(`${e.role || 'Internship'}${e.company ? ' — ' + e.company : ''}`, dateRange(e.startDate, e.endDate, e.current));
      if (e.location) w.subLine(e.location);
      w.bullets(e.description);
    });
  },
  volunteering: (w, r) => {
    w.heading('Volunteer Experience');
    (r.volunteering || []).forEach((e) => {
      w.entryHeader(`${e.role || 'Volunteer'}${e.organization ? ' — ' + e.organization : ''}`, dateRange(e.startDate, e.endDate, e.current));
      if (e.location) w.subLine(e.location);
      w.bullets(e.description);
    });
  },
  education: (w, r) => {
    w.heading('Education');
    (r.education || []).forEach((e) => {
      w.entryHeader(`${e.degree || 'Degree'}${e.institution ? ' — ' + e.institution : ''}`, dateRange(e.startDate, e.endDate));
      w.paragraph(e.description);
    });
  },
  projects: (w, r) => {
    w.heading('Projects');
    (r.projects || []).forEach((p) => {
      w.entryHeader(p.title || 'Project', '');
      if (p.technologies) w.subLine(p.technologies);
      w.paragraph(p.description);
      if (p.link) w.paragraph(p.link);
    });
  },
  skills: (w, r) => {
    w.heading('Skills');
    w.commaList((r.skills || []).map((s) => s.name).filter(Boolean));
  },
  certifications: (w, r) => {
    w.heading('Certifications');
    (r.certifications || []).forEach((c) => {
      w.entryHeader(`${c.name || 'Certification'}${c.issuer ? ' — ' + c.issuer : ''}`, c.year || '');
    });
  },
  achievements: (w, r) => {
    w.heading('Achievements');
    (r.achievements || []).forEach((a) => {
      w.entryHeader(a.title || 'Achievement', a.year || '');
      w.paragraph(a.description);
    });
  },
  publications: (w, r) => {
    w.heading('Publications');
    (r.publications || []).forEach((p) => {
      w.entryHeader(`${p.title || 'Publication'}${p.publisher ? ' — ' + p.publisher : ''}`, p.year || '');
      w.paragraph(p.description);
    });
  },
  trainings: (w, r) => {
    w.heading('Trainings');
    (r.trainings || []).forEach((t) => {
      w.entryHeader(`${t.title || 'Training'}${t.provider ? ' — ' + t.provider : ''}`, dateRange(t.startDate, t.endDate));
      w.paragraph(t.description);
    });
  },
  scholarships: (w, r) => {
    w.heading('Scholarships');
    (r.scholarships || []).forEach((s) => {
      w.entryHeader(`${s.title || 'Scholarship'}${s.institution ? ' — ' + s.institution : ''}`, s.year || '');
      w.paragraph(s.description);
    });
  },
  positionsOfResponsibility: (w, r) => {
    w.heading('Positions of Responsibility');
    (r.positionsOfResponsibility || []).forEach((p) => {
      w.entryHeader(`${p.title || 'Position'}${p.organization ? ' — ' + p.organization : ''}`, dateRange(p.startDate, p.endDate));
      w.paragraph(p.description);
    });
  },
  hobbies: (w, r) => {
    w.heading('Hobbies');
    w.commaList(r.hobbies || []);
  },
  references: (w, r) => {
    w.heading('References');
    (r.references || []).forEach((ref) => {
      w.entryHeader(ref.name || 'Reference', ref.relationship || '');
      w.paragraph([ref.company, ref.email, ref.phone].filter(Boolean).join('  •  '));
    });
  },
  languages: (w, r) => {
    w.heading('Languages');
    w.commaList((r.languages || []).map((l) => `${l.name} (${l.level})`).filter(Boolean));
  },
};

export const generateAtsSafePDF = async (resume: Resume, fileName: string) => {
  // ATS-safe templates ignore the getTheme() font-family override on
  // screen (see registry.ts's fontCustomizable flag on the Harvard/
  // Stanford/etc. formats), but the explicit choice a user makes here
  // (jsPDF only ships helvetica/times/courier) is still honored for the
  // TEXT export — those named formats are fixed on-screen for their visual
  // identity, not because Times/Courier would be an unsafe PDF choice.
  const font = getFontFamilyPreset(resume.fontFamily).pdfFont;
  const w = new TextPdfWriter(combinedScale(resume), font);
  const p = resume.personalInfo || ({} as Resume['personalInfo']);

  w.name(p.fullName || resume.title || 'Resume');
  w.contactLine([p.email, p.phone, p.location, p.linkedin, p.github, p.website]);

  for (const sectionId of getVisibleOrderedSections(resume)) {
    if (isCustomSectionId(sectionId)) {
      const content = getCustomSectionContent(resume, sectionId);
      if (!content) continue;
      w.heading(content.title || sectionLabel(resume, sectionId));
      w.paragraph(content.content);
      continue;
    }
    SECTION_RENDERERS[sectionId]?.(w, resume);
  }

  w.pdf.save(fileName);

  if (resume.layout) {
    logResumeBuild(resume.layout, 'ats-safe-text-pdf', 'downloaded');
  }
};
