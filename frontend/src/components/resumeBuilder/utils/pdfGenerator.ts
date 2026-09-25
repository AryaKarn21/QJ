import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { logResumeBuild } from './aiUsageApi';
import type { Resume } from '../resumeApi';
import '../resumeBuilder.css';   // page‑break avoidance styles
import { getVisibleOrderedSections, sectionLabel, getCustomSectionContent, isCustomSectionId } from '../templates/shared/sections';
import { getFontFamilyPreset } from '../themePresets';
import { sanitizeResumeLink } from '../templates/shared/ResumeLink';

// Same combined fontScale × spacing multiplier ResumeEditor.tsx's live
// preview applies via CSS `zoom` — kept here too so the exported PDF's
// density always matches what was on screen.
const SPACING_SCALE: Record<string, number> = { compact: 0.97, standard: 1, relaxed: 1.05 };
const combinedScale = (resume: Resume) => (resume.fontScale ?? 1) * (SPACING_SCALE[resume.spacing || 'standard'] ?? 1);

export const generatePDF = async (

  elementRef: React.RefObject<HTMLDivElement>,
  fileName: string,
  templateId?: string,
  templateName?: string,
  resume?: Resume
) => {
  if (!elementRef.current) return;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;

  // Check if element contains discrete .resume-page sheets (from A4PageContainer)
  const pageElements = Array.from(
    elementRef.current.querySelectorAll<HTMLElement>('.resume-page')
  );

  if (pageElements.length > 0) {
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) {
        pdf.addPage('a4', 'p');
      }
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      // ---- Page numbering -------------------------------------------------
      if (resume?.pageNumbering && resume.pageNumbering !== 'no') {
        const total = pageElements.length;
        const current = i + 1;
        const style = resume.pageNumberStyle || 'full';
        let text = '';
        if (style === 'plain') text = `${current}`;
        else if (style === 'prefixed') text = `Page ${current}`;
        else text = `Page ${current} of ${total}`;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(text, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      // ------------------------------------------------------------------
    }
  } else {
    // Continuous fallback if .resume-page is not present
    const canvas = await html2canvas(elementRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 12) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
  }

  pdf.save(fileName);

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

  contactLine(parts: (string | undefined)[]) {
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

  pipeList(items: string[]) {
    if (!items.length) return;
    this.paragraph(items.join(' | '));
  }

  // Unlike generatePDF() (a flat screenshot — no clickable anything, it's
  // just an image), this export draws real text via jsPDF's native APIs,
  // so a link can be made genuinely clickable with `textWithLink`. Runs
  // the same protocol allow-list every on-screen template link does
  // (`sanitizeResumeLink`) before ever handing a URL to jsPDF — silently
  // does nothing for an empty/unsafe value, same as the on-screen component.
  link(label: string, url?: string) {
    const safe = sanitizeResumeLink(url);
    if (!safe) return;
    this.pdf.setFont(this.font, 'normal');
    this.pdf.setFontSize(9.5 * this.scale);
    this.ensureSpace(5 * this.scale);
    this.pdf.setTextColor(37, 99, 235);
    this.pdf.textWithLink(label, MARGIN, this.y, { url: safe });
    this.pdf.setTextColor(0, 0, 0);
    this.y += 5 * this.scale;
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
      w.link('Company Link', e.link);
    });
  },
  internships: (w, r) => {
    w.heading('Internships');
    (r.internships || []).forEach((e) => {
      w.entryHeader(`${e.role || 'Internship'}${e.company ? ' — ' + e.company : ''}`, dateRange(e.startDate, e.endDate, e.current));
      if (e.location) w.subLine(e.location);
      w.bullets(e.description);
      w.link('Company Link', e.link);
    });
  },
  volunteering: (w, r) => {
    w.heading('Volunteer Experience');
    (r.volunteering || []).forEach((e) => {
      w.entryHeader(`${e.role || 'Volunteer'}${e.organization ? ' — ' + e.organization : ''}`, dateRange(e.startDate, e.endDate, e.current));
      if (e.location) w.subLine(e.location);
      w.bullets(e.description);
      w.link('Organization Link', e.link);
    });
  },
  education: (w, r) => {
    w.heading('Education');
    (r.education || []).forEach((e) => {
      w.entryHeader(`${e.degree || 'Degree'}${e.institution ? ' — ' + e.institution : ''}`, dateRange(e.startDate, e.endDate));
      w.paragraph(e.description);
      w.link('Institution Website', e.link);
    });
  },
  projects: (w, r) => {
    w.heading('Projects');
    (r.projects || []).forEach((p) => {
      w.entryHeader(p.title || 'Project', '');
      if (p.technologies) w.subLine(p.technologies);
      w.paragraph(p.description);
      w.link('View Project', p.link);
    });
  },
  skills: (w, r) => {
    const allSkills: string[] = [];
    const seen = new Set<string>();
    const addSkill = (name?: string) => {
      if (!name) return;
      const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        allSkills.push(clean);
      }
    };
    (r.skills || []).forEach((s) => addSkill(typeof s === 'string' ? s : s?.name));
    const c = r.countryCVInfo;
    if (c) {
      (c.structuredDigitalSkills || []).forEach((s) => addSkill(typeof s === 'object' ? s.name || s.skill : s));
      (c.digitalSkills || []).forEach((s) => addSkill(typeof s === 'string' ? s : (s as any)?.name));
      (c.structuredSoftwareSkills || []).forEach((s) => addSkill(typeof s === 'object' ? s.name || s.skill : s));
      if (c.otherSkills) c.otherSkills.split(/[,|\n]/).forEach(addSkill);
    }
    if (allSkills.length === 0) return;
    w.heading('Skills');
    w.pipeList(allSkills);
  },
  certifications: (w, r) => {
    w.heading('Certifications');
    (r.certifications || []).forEach((c) => {
      w.entryHeader(`${c.name || 'Certification'}${c.issuer ? ' — ' + c.issuer : ''}`, c.year || '');
      w.link('View Credential', c.link);
    });
  },
  achievements: (w, r) => {
    w.heading('Achievements');
    (r.achievements || []).forEach((a) => {
      w.entryHeader(a.title || 'Achievement', a.year || '');
      w.paragraph(a.description);
      w.link('View Proof', a.link);
    });
  },
  publications: (w, r) => {
    w.heading('Publications');
    (r.publications || []).forEach((p) => {
      w.entryHeader(`${p.title || 'Publication'}${p.publisher ? ' — ' + p.publisher : ''}`, p.year || '');
      w.paragraph(p.description);
      w.link('View Publication', p.link);
    });
  },
  trainings: (w, r) => {
    w.heading('Trainings');
    (r.trainings || []).forEach((t) => {
      w.entryHeader(`${t.title || 'Training'}${t.provider ? ' — ' + t.provider : ''}`, dateRange(t.startDate, t.endDate));
      w.paragraph(t.description);
      w.link('View Course', t.link);
    });
  },
  scholarships: (w, r) => {
    w.heading('Scholarships');
    (r.scholarships || []).forEach((s) => {
      w.entryHeader(`${s.title || 'Scholarship'}${s.institution ? ' — ' + s.institution : ''}`, s.year || '');
      w.paragraph(s.description);
      w.link('View Award', s.link);
    });
  },
  positionsOfResponsibility: (w, r) => {
    w.heading('Positions of Responsibility');
    (r.positionsOfResponsibility || []).forEach((p) => {
      w.entryHeader(`${p.title || 'Position'}${p.organization ? ' — ' + p.organization : ''}`, dateRange(p.startDate, p.endDate));
      w.paragraph(p.description);
      w.link('Organization Link', p.link);
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
      w.link('Profile', ref.link);
    });
  },
  languages: (w, r) => {
    w.heading('Languages');
    w.commaList((r.languages || []).map((l) => `${l.name} (${l.level})`).filter(Boolean));
  },
  documents: (w, r) => {
    const docs = (r.documents || []).filter((d) => d.includeInDownload);
    if (!docs.length) return;
    w.heading('Supporting Documents');
    docs.forEach((doc) => {
      w.entryHeader(doc.name, (doc.documentType || 'Document').toUpperCase());
    });
  },
  declaration: (w, r) => {
    const text =
      r.countryCVInfo?.declaration && r.countryCVInfo.declaration.trim()
        ? r.countryCVInfo.declaration.replace(/BELEIF/gi, 'BELIEF')
        : 'I HEREBY DECLARE THAT THE INFORMATION GIVEN IN THIS CV IS TRUE AND HONEST TO MY KNOWLEDGE AND BELIEF.';
    w.heading('Declaration');
    w.paragraph(text);
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

  const renderedSections = new Set<string>();

  for (const sectionId of getVisibleOrderedSections(resume)) {
    if (isCustomSectionId(sectionId)) {
      const content = getCustomSectionContent(resume, sectionId);
      if (!content) continue;
      w.heading(content.title || sectionLabel(resume, sectionId));
      w.paragraph(content.content);
      w.link('Learn More', content.link);
      continue;
    }
    SECTION_RENDERERS[sectionId]?.(w, resume);
    renderedSections.add(sectionId);
  }


  // If this is a country CV with declaration and not in section order, render it
  if (resume.countryCVInfo && !renderedSections.has('declaration')) {
    SECTION_RENDERERS['declaration']?.(w, resume);
  }

  // Draw professional footer page numbering on ATS Safe PDF
  const pageOption = resume.pageNumbering || 'all';
  if (pageOption !== 'no' && pageOption !== 'none') {
    const totalPages = w.pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      const showOnThisPage =
        pageOption === 'all' ||
        (pageOption === 'first' && i === 1) ||
        (pageOption === 'last' && i === totalPages);

      if (showOnThisPage) {
        w.pdf.setPage(i);
        w.pdf.setFont('helvetica', 'normal');
        w.pdf.setFontSize(8.5);
        w.pdf.setTextColor(100, 116, 139);
        w.pdf.setDrawColor(226, 232, 240);
        w.pdf.setLineWidth(0.3);
        w.pdf.line(MARGIN, 287, PAGE_WIDTH - MARGIN, 287);
        // Determine page number text based on selected style
        let text: string;
        switch (resume.pageNumberStyle) {
          case 'plain':
            text = `${i}`;
            break;
          case 'prefixed':
            text = `Page ${i}`;
            break;
          case 'full':
          default:
            text = `Page ${i} of ${totalPages}`;
        }
        const textWidth = w.pdf.getTextWidth(text);
        w.pdf.text(text, PAGE_WIDTH - MARGIN - textWidth, 292);
      }
    }
  }

  w.pdf.save(fileName);

  if (resume.layout) {
    logResumeBuild(resume.layout, 'ats-safe-text-pdf', 'downloaded');
  }
};
