const path = require("path");
const fs = require("fs");
const Resume = require("../models/Resume");
const { persistUpload, deleteStoredFile, getCloudinaryPrivateDownloadUrl, isCloudinaryUrl } = require("../services/media.service");

// Mongoose ValidationError/CastError (bad enum value, malformed ObjectId,
// ...) is the client's fault — 400, with the real reason. Anything else
// (DB connection drop, unexpected driver error) is a genuine 500, always
// logged server-side with the stack so it's traceable in Render logs
// instead of a bare "Server error" with no context.
function respondResumeError(res, error, action) {
  console.error(`Error ${action} resume:`, error);
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  return res.status(500).json({ message: "Server error" });
}

// List the logged-in user's resumes (most recently edited first) —
// summary fields only, used for the "My Resumes" / template gallery view.
const getMyResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user.id })
      .select("title targetRole layout theme status updatedAt createdAt countryCode")
      .sort({ updatedAt: -1 });
    res.json(resumes);
  } catch (error) {
    respondResumeError(res, error, "fetching");
  }
};

// Get one full resume (for the editor)
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json(resume);
  } catch (error) {
    respondResumeError(res, error, "fetching");
  }
};

// Create a new resume — called when the user picks a template from the gallery
const createResume = async (req, res) => {
  try {
    const { layout, theme, title, targetRole, countryCode, countryCVInfo } = req.body;

    const resume = await Resume.create({
      user: req.user.id,
      layout: layout || "ats-minimal",
      theme: theme || "violet",
      title: title || (countryCode ? `Untitled ${countryCode.toUpperCase()} CV` : "Untitled Resume"),
      targetRole: targetRole || "",
      countryCode: countryCode || "",
      countryCVInfo: countryCVInfo || {},
      personalInfo: { fullName: req.user.name || "", email: req.user.email || "" },
    });

    res.status(201).json(resume);
  } catch (error) {
    respondResumeError(res, error, "creating");
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
  "pageNumbering",
  "showLogo",
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
  "countryCode",
  "countryCVInfo",
  "documents",
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
    respondResumeError(res, error, "updating");
  }
};

// Clone an existing resume — copies all experience, education, skills, etc.
// into a new resume (optionally targeting a new country CV format)
const cloneResume = async (req, res) => {
  try {
    const sourceResume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!sourceResume) return res.status(404).json({ message: "Resume not found" });

    const { targetCountryCode, layout, title } = req.body;
    const cloned = sourceResume.toObject();
    delete cloned._id;
    delete cloned.createdAt;
    delete cloned.updatedAt;

    cloned.countryCode = targetCountryCode !== undefined ? targetCountryCode : (cloned.countryCode || "");
    if (layout) cloned.layout = layout;
    if (title) {
      cloned.title = title;
    } else {
      const candidateName = cloned.personalInfo?.fullName || "My Resume";
      const countrySuffix = cloned.countryCode ? ` - ${cloned.countryCode.toUpperCase()} CV` : " (Copy)";
      cloned.title = `${candidateName}${countrySuffix}`;
    }
    cloned.status = "draft";

    const newResume = await Resume.create(cloned);
    res.status(201).json(newResume);
  } catch (error) {
    respondResumeError(res, error, "cloning");
  }
};

const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.json({ message: "Resume deleted successfully" });
  } catch (error) {
    respondResumeError(res, error, "deleting");
  }
};

// Upload supporting documents (Passport, Certificate, etc.)
const uploadResumeDocument = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    if (!req.file) {
      return res.status(400).json({ message: "No document file provided." });
    }

    const fileUrl = await persistUpload(req.file, "resume_documents", req.user.id);
    const newDoc = {
      documentType: req.body.documentType || "other",
      name: (req.body.name || req.file.originalname || "Supporting Document").trim(),
      fileUrl,
      mimeType: req.file.mimetype || "",
      fileSize: req.file.size || 0,
      includeInDownload: true,
      sortOrder: (resume.documents || []).length,
    };

    resume.documents.push(newDoc);
    await resume.save();

    const createdDoc = resume.documents[resume.documents.length - 1];
    res.status(201).json({ message: "Document uploaded successfully", document: createdDoc, documents: resume.documents });
  } catch (error) {
    respondResumeError(res, error, "uploading document to");
  }
};

const deleteResumeDocument = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const doc = resume.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.fileUrl) {
      try {
        await deleteStoredFile(doc.fileUrl);
      } catch (err) {
        console.warn("Could not delete stored file:", err);
      }
    }

    resume.documents.pull({ _id: req.params.docId });
    await resume.save();

    res.json({ message: "Document deleted successfully", documents: resume.documents });
  } catch (error) {
    respondResumeError(res, error, "deleting document from");
  }
};

const toggleResumeDocument = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const doc = resume.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (req.body.includeInDownload !== undefined) {
      doc.includeInDownload = Boolean(req.body.includeInDownload);
    }
    if (req.body.name) {
      doc.name = req.body.name.trim();
    }
    if (req.body.sortOrder !== undefined) {
      doc.sortOrder = req.body.sortOrder;
    }

    await resume.save();
    res.json({ message: "Document updated successfully", document: doc, documents: resume.documents });
  } catch (error) {
    respondResumeError(res, error, "updating document in");
  }
};

const getResumeDocumentFile = async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const doc = resume.documents.id(req.params.docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const fileUrl = doc.fileUrl;
    if (!fileUrl) {
      return res.status(404).json({ message: "File URL not found" });
    }

    const isDownload = req.query.download === "true";
    const cleanFilename = `${(doc.name || "document").replace(/[^a-zA-Z0-9_-]/g, "_")}${doc.mimeType === "application/pdf" ? ".pdf" : ""}`;

    // If Cloudinary URL, sign it with private download URL to bypass 401
    if (isCloudinaryUrl(fileUrl)) {
      const signedUrl = getCloudinaryPrivateDownloadUrl(fileUrl, isDownload ? cleanFilename : undefined);
      return res.redirect(signedUrl || fileUrl);
    }

    // If external URL
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return res.redirect(fileUrl);
    }

    // If local file on disk
    const localPath = path.join(__dirname, "..", fileUrl);
    if (fs.existsSync(localPath)) {
      if (isDownload) {
        return res.download(localPath, cleanFilename);
      }
      return res.sendFile(localPath);
    }

    return res.status(404).json({ message: "Document file not found on disk." });
  } catch (error) {
    respondResumeError(res, error, "accessing document file for");
  }
};

module.exports = {
  getMyResumes,
  getResumeById,
  createResume,
  updateResume,
  cloneResume,
  deleteResume,
  uploadResumeDocument,
  deleteResumeDocument,
  toggleResumeDocument,
  getResumeDocumentFile,
};