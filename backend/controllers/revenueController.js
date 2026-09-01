const Revenue = require("../models/Revenue");
const User = require("../models/User");
const Job = require("../models/Job");

// GET: Form data - employers and their jobs
exports.getEmployerJobs = async (req, res) => {
  try {
    const employers = await User.find({ role: "employer" }).select("name email");
    res.status(200).json({ employers });
  } catch (err) {
    res.status(500).json({ message: "Error fetching employers", error: err.message });
  }
};

// GET: Jobs of specific employer
exports.getJobsByEmployer = async (req, res) => {
  try {
    const employerId = req.params.employerId;
    const jobs = await Job.find({ employer: employerId }).select("title");
    res.status(200).json({ jobs });
  } catch (err) {
    res.status(500).json({ message: "Error fetching jobs", error: err.message });
  }
};

// GET: Get all revenues
exports.getAllRevenue = async (req, res) => {
  try {
    const revenues = await Revenue.find()
      .populate({
        path: "paidBy",
        select: "name email",
      })
      .populate({
        path: "paidFor",
        select: "title istrending",
      })
      .sort({ createdAt: -1 });

    res.status(200).json(revenues);
  } catch (err) {
    res.status(500).json({ message: "Error fetching revenue records", error: err.message });
  }
};

// POST: Add revenue
exports.addRevenue = async (req, res) => {
  try {
    const { amount, currency, paidBy, paidFor, remarks } = req.body;

    // Allow standard ISO currency codes
    const allowedCurrencies = ["USD", "EUR", "GBP", "INR", "AED", "NPR"];
    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({ message: "Invalid currency selected" });
    }

    const employer = await User.findById(paidBy);
    if (!employer || employer.role !== "employer") {
      return res.status(400).json({ message: "Selected user is not an employer" });
    }

    const job = await Job.findById(paidFor);
    if (!job || String(job.employer) !== paidBy) {
      return res.status(400).json({ message: "Job does not belong to selected employer" });
    }

    const revenue = new Revenue({ amount, currency, paidBy, paidFor, remarks });
    await revenue.save();

    // Optionally mark job as trending
    job.istrending = true;
    await job.save();

    res.status(201).json({ message: "Revenue added successfully", revenue });
  } catch (err) {
    res.status(500).json({ message: "Error adding revenue", error: err.message });
  }
};

// PUT: Edit revenue
exports.editRevenue = async (req, res) => {
  try {
    const revenueId = req.params.id;
    const { amount, currency, paidBy, paidFor, remarks } = req.body;

    // Allow standard ISO currency codes
    const allowedCurrencies = ["USD", "EUR", "GBP", "INR", "AED", "NPR"];
    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({ message: "Invalid currency selected" });
    }

    const employer = await User.findById(paidBy);
    if (!employer || employer.role !== "employer") {
      return res.status(400).json({ message: "Selected user is not an employer" });
    }

    const job = await Job.findById(paidFor);
    if (!job || String(job.employer) !== paidBy) {
      return res.status(400).json({ message: "Job does not belong to selected employer" });
    }

    const revenue = await Revenue.findByIdAndUpdate(
      revenueId,
      { amount, currency, paidBy, paidFor, remarks },
      { new: true }
    );

    res.status(200).json({ message: "Revenue updated successfully", revenue });
  } catch (err) {
    res.status(500).json({ message: "Error editing revenue", error: err.message });
  }
};

// DELETE: Delete revenue
exports.deleteRevenue = async (req, res) => {
  try {
    const revenueId = req.params.id;

    const deleted = await Revenue.findByIdAndDelete(revenueId);
    if (!deleted) {
      return res.status(404).json({ message: "Revenue entry not found" });
    }

    res.status(200).json({ message: "Revenue deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting revenue", error: err.message });
  }
};
