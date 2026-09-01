// Unit tests for the chatbot's FAQ-fallback matcher (backend/controllers/chatbotController.js).
// Pure function, no DB — mirrors the pattern in tests/atsAnalysis.test.js.
const { scoreFaqMatch, genericFallback } = require("../controllers/chatbotController");

const faqs = [
  {
    question: "How do I apply for a job?",
    answer: "Open a job listing and click Apply.",
  },
  {
    question: "How do I reset my password?",
    answer: "Use the Forgot Password link on the login page.",
  },
  {
    question: "What is the ATS score?",
    answer: "The ATS score estimates how well your resume matches a job description.",
  },
];

describe("chatbotController.scoreFaqMatch", () => {
  it("returns null for empty/whitespace-only input", () => {
    expect(scoreFaqMatch(faqs, "")).toBeNull();
    expect(scoreFaqMatch(faqs, "   ")).toBeNull();
  });

  it("returns null when no FAQ shares any meaningful word with the message", () => {
    expect(scoreFaqMatch(faqs, "xyz qux wibble")).toBeNull();
  });

  it("matches the best-scoring FAQ by keyword overlap", () => {
    const result = scoreFaqMatch(faqs, "How can I apply for a job posting?");
    expect(result).not.toBeNull();
    expect(result.source).toBe("faq");
    expect(result.matchedQuestion).toBe("How do I apply for a job?");
    expect(result.reply).toBe("Open a job listing and click Apply.");
  });

  it("matches password-reset questions to the password FAQ, not the job FAQ", () => {
    const result = scoreFaqMatch(faqs, "I forgot my password, how do I reset it?");
    expect(result.matchedQuestion).toBe("How do I reset my password?");
  });

  it("is case-insensitive and ignores punctuation", () => {
    const result = scoreFaqMatch(faqs, "WHAT'S the ATS-score???");
    expect(result.matchedQuestion).toBe("What is the ATS score?");
  });

  it("ignores words of length <= 2 so short filler words don't skew scoring", () => {
    // "is", "an", "of" etc. shouldn't count toward the match score.
    expect(scoreFaqMatch(faqs, "is an of")).toBeNull();
  });
});

describe("chatbotController.genericFallback", () => {
  it("returns a non-AI, non-empty canned reply", () => {
    const result = genericFallback();
    expect(result.source).toBe("fallback");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
