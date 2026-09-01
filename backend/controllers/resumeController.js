const Resume = require("../models/Resume");

// List the logged-in user's resumes (most recently edited first) —
// summary fields only, used for the "My Resumes" / template gallery view.
const getMyResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id })
      .select("title targetRole layout theme status updatedAt createdAt")
      .sort({ updatedAt: -1 });
    res.json(resumes);
  } catch (error) {
    console.error("Error fetching resumes:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get one full resume (for the editor)
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json(resume);
  } catch (error) {
    console.error("Error fetching resume:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new resume — called when the user picks a template from the gallery
const createResume = async (req, res) => {
  try {
    const { layout, theme, title, targetRole } = req.body;

    const resume = await Resume.create({
      user: req.user.id,
      layout: layout || "ats-minimal",
      theme: theme || "violet",
      title: title || "Untitled Resume",
      targetRole: targetRole || "",
      personalInfo: { fullName: req.user.name || "", email: req.user.email || "" },
    });

    res.status(201).json(resume);
  } catch (error) {
    console.error("Error creating resume:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a resume — used for every editor field change AND autosave.
// Accepts a partial body; only known top-level fields are applied, so an
// autosave payload can safely send just what changed.
const UPDATABLE_FIELDS = [
  "title",
  "targetRole",
  "layout",
  "theme",
  "fontFamily",
  "fontScale",
  "spacing",
  "personalInfo",
  "summary",
  "experience",
  "internships",
  "education",
  "projects",
  "skills",
  "certifications",
  "achievements",
  "publications",
  "trainings",
  "scholarships",
  "positionsOfResponsibility",
  "hobbies",
  "references",
  "languages",
  "volunteering",
  "customSections",
  "sectionOrder",
  "hiddenSections",
  "workerInfo",
  "workerCategoryId",
  "languageMode",
  "status",
];

const updateResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    UPDATABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        resume[field] = req.body[field];
      }
    });

    await resume.save();
    res.json(resume);
  } catch (error) {
    console.error("Error updating resume:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getMyResumes, getResumeById, createResume, updateResume, deleteResume };