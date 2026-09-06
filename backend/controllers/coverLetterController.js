const CoverLetter = require("../models/CoverLetter");

// List the logged-in user's saved cover letters (most recently edited
// first) — summary fields only, same shape as resumeController.getMyResumes
// (used for the "reuse a previous cover letter" picker).
const getMyCoverLetters = async (req, res) => {
  try {
    const letters = await CoverLetter.find({ user: req.user.id })
      .select("title templateId job isDefault updatedAt createdAt")
      .sort({ updatedAt: -1 });
    res.json(letters);
  } catch (error) {
    console.error("Error fetching cover letters:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get one full cover letter (for the editor)
const getCoverLetterById = async (req, res) => {
  try {
    const letter = await CoverLetter.findOne({ _id: req.params.id, user: req.user.id });
    if (!letter) return res.status(404).json({ message: "Cover letter not found" });
    res.json(letter);
  } catch (error) {
    console.error("Error fetching cover letter:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const MAX_CONTENT_LENGTH = 20000; // generous ceiling for HTML content — guards against an abusive payload, not a real-world letter

const createCoverLetter = async (req, res) => {
  try {
    const { title, content, templateId, job, isDefault } = req.body;

    if (content && typeof content === "string" && content.length > MAX_CONTENT_LENGTH) {
      return res.status(422).json({ message: "Cover letter content is too long." });
    }

    if (isDefault) {
      await CoverLetter.updateMany({ user: req.user.id, isDefault: true }, { isDefault: false });
    }

    const letter = await CoverLetter.create({
      user: req.user.id,
      title: title || "Untitled Cover Letter",
      content: content || "",
      templateId: templateId || "professional",
      job: job || null,
      isDefault: Boolean(isDefault),
    });

    res.status(201).json(letter);
  } catch (error) {
    console.error("Error creating cover letter:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const UPDATABLE_FIELDS = ["title", "content", "templateId", "job", "isDefault"];

const updateCoverLetter = async (req, res) => {
  try {
    const letter = await CoverLetter.findOne({ _id: req.params.id, user: req.user.id });
    if (!letter) return res.status(404).json({ message: "Cover letter not found" });

    if (
      req.body.content !== undefined &&
      typeof req.body.content === "string" &&
      req.body.content.length > MAX_CONTENT_LENGTH
    ) {
      return res.status(422).json({ message: "Cover letter content is too long." });
    }

    if (req.body.isDefault === true) {
      await CoverLetter.updateMany(
        { user: req.user.id, isDefault: true, _id: { $ne: letter._id } },
        { isDefault: false }
      );
    }

    UPDATABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        letter[field] = req.body[field];
      }
    });

    await letter.save();
    res.json(letter);
  } catch (error) {
    console.error("Error updating cover letter:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteCoverLetter = async (req, res) => {
  try {
    const letter = await CoverLetter.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!letter) return res.status(404).json({ message: "Cover letter not found" });
    res.json({ message: "Cover letter deleted successfully" });
  } catch (error) {
    console.error("Error deleting cover letter:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getMyCoverLetters,
  getCoverLetterById,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
};
