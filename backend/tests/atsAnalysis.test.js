// Unit tests for the rule-based ATS analyzer (backend/services/atsAnalysis.service.js).
// Pure function, no DB — tests call it directly with plain resume-shaped objects.
const { analyzeResumeAts, DISCLAIMER } = require("../services/atsAnalysis.service");

const emptyResume = () => ({
  personalInfo: { fullName: "", email: "", phone: "", location: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  sectionOrder: [],
  hiddenSections: [],
  layout: "ats-minimal",
});

const strongResume = () => ({
  personalInfo: {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "1234567890",
    location: "Kathmandu, Nepal",
    linkedin: "https://linkedin.com/in/janedoe",
  },
  summary: "Frontend engineer with 5 years building React applications.",
  targetRole: "Frontend Engineer",
  experience: [
    {
      role: "Frontend Engineer",
      company: "Acme Corp",
      description: "Led migration of the dashboard to React and TypeScript\nImproved page load time by 40% through code splitting\nMentored two junior engineers",
    },
  ],
  education: [{ degree: "B.Tech Computer Science", institution: "KIIT" }],
  skills: [
    { name: "React", category: "Frameworks" },
    { name: "TypeScript", category: "Programming Languages" },
    { name: "Node.js", category: "Frameworks" },
    { name: "CSS", category: "Other" },
    { name: "Git", category: "DevOps" },
  ],
  projects: [{ title: "Portfolio site", description: "Built with React and TypeScript", technologies: "React, TypeScript" }],
  certifications: [],
  sectionOrder: ["summary", "experience", "education", "skills", "projects"],
  hiddenSections: [],
  layout: "ats-minimal",
});

describe("analyzeResumeAts", () => {
  test("always includes the non-guarantee disclaimer", () => {
    const result = analyzeResumeAts(emptyResume());
    expect(result.disclaimer).toBe(DISCLAIMER);
  });

  test("scores an empty resume low and flags critical gaps", () => {
    const result = analyzeResumeAts(emptyResume());
    expect(result.overallScore).toBeLessThan(40);
    expect(result.status).toBe("critical");
    const criticalMessages = result.suggestions.filter((s) => s.severity === "critical");
    expect(criticalMessages.length).toBeGreaterThan(0);
    // Must call out the two hard requirements explicitly.
    expect(result.suggestions.some((s) => /email/i.test(s.message))).toBe(true);
    expect(result.suggestions.some((s) => /experience/i.test(s.message))).toBe(true);
  });

  test("scores a complete, well-structured resume well", () => {
    const result = analyzeResumeAts(strongResume());
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(["good", "warning"]).toContain(result.status);
  });

  test("flags hiding a critical section (experience/education/skills)", () => {
    const resume = strongResume();
    resume.hiddenSections = ["experience"];
    const result = analyzeResumeAts(resume);
    const structureCategory = result.categories.find((c) => c.key === "structure");
    expect(structureCategory.status).toBe("critical");
  });

  test("computes job-description keyword overlap only when a target role or JD text exists", () => {
    const resumeWithNoRole = strongResume();
    resumeWithNoRole.targetRole = "";
    const withoutJd = analyzeResumeAts(resumeWithNoRole);
    expect(withoutJd.jdKeywords).toBeNull();

    // No explicit jobText, but `targetRole` is set — used as a fallback so
    // relevance can still be estimated without requiring a pasted JD.
    const viaTargetRole = analyzeResumeAts(strongResume());
    expect(viaTargetRole.jdKeywords).not.toBeNull();

    const withJd = analyzeResumeAts(strongResume(), "Looking for a React TypeScript engineer with GraphQL experience");
    expect(withJd.jdKeywords).not.toBeNull();
    expect(withJd.jdKeywords.matched).toEqual(expect.arrayContaining(["react", "typescript"]));
    expect(withJd.jdKeywords.missing).toEqual(expect.arrayContaining(["graphql"]));
  });

  test("is deterministic — same input always produces the same score", () => {
    const a = analyzeResumeAts(strongResume());
    const b = analyzeResumeAts(strongResume());
    expect(a.overallScore).toBe(b.overallScore);
  });
});
