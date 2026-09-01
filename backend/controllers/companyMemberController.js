const mongoose = require("mongoose");
const CompanyMember = require("../models/CompanyMember");
const User = require("../models/User");

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns true if the requesting user is the company owner (employer) OR a superadmin.
const assertCompanyOwner = (req, res, companyId) => {
  const isSuperAdmin = req.user.role === "superadmin";
  const isOwner = String(req.user._id) === String(companyId);
  if (!isSuperAdmin && !isOwner) {
    res.status(403).json({
      message: "Access denied. You can only manage your own company's employees.",
    });
    return false;
  }
  return true;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── GET /api/companies/:companyId/employees ──────────────────────────────────
const getEmployees = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    const company = await User.findOne({ _id: companyId, role: "employer" }).select(
      "name companyLogo industryType address"
    );
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const { search = "", department = "", status = "" } = req.query;

    const memberFilter = { company: companyId };
    if (status === "Active" || status === "Inactive") {
      memberFilter.status = status;
    }
    if (department) {
      memberFilter.department = { $regex: department, $options: "i" };
    }

    // .lean() matters here, not just for speed: `user` refs the base User
    // model, but profilePic/companyLogo are declared only on the
    // Jobseeker/Employer discriminator schemas. Without .lean(), Mongoose
    // hydrates the populated sub-document against the base User schema
    // and silently strips any field the base schema doesn't declare —
    // profilePic comes back through the select() projection at the Mongo
    // level, then gets dropped on cast. .lean() returns the raw object
    // with no schema casting, so it survives. (Same fix applied to every
    // other populate() in this file that selects profilePic/companyLogo.)
    let members = await CompanyMember.find(memberFilter)
      .populate({
        path: "user",
        select: "name email headline profilePic companyLogo bio socialLinks role",
      })
      .sort({ joinedAt: -1 })
      .lean();

    if (search) {
      const q = search.toLowerCase();
      members = members.filter((m) => {
        if (!m.user) return false;
        return (
          (m.user.name || "").toLowerCase().includes(q) ||
          (m.user.email || "").toLowerCase().includes(q) ||
          (m.designation || "").toLowerCase().includes(q)
        );
      });
    }

    res.json({ employees: members });
  } catch (error) {
    console.error("getEmployees error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── GET /api/companies/:companyId/employees/count ────────────────────────────
const getEmployeeCount = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    const count = await CompanyMember.countDocuments({
      company: companyId,
      status: "Active",
    });

    res.json({ count });
  } catch (error) {
    console.error("getEmployeeCount error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── GET /api/companies/:companyId/employees/:memberId ────────────────────────
const getEmployee = async (req, res) => {
  try {
    const { companyId, memberId } = req.params;

    if (!isValidObjectId(companyId) || !isValidObjectId(memberId)) {
      return res.status(400).json({ message: "Invalid ID." });
    }

    const member = await CompanyMember.findOne({
      _id: memberId,
      company: companyId,
    })
      .populate({
        path: "user",
        select: "name email headline profilePic companyLogo bio socialLinks role",
      })
      .lean();

    if (!member) {
      return res.status(404).json({ message: "Employee not found." });
    }

    res.json({ employee: member });
  } catch (error) {
    console.error("getEmployee error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── POST /api/companies/:companyId/employees ─────────────────────────────────
const addEmployee = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    if (!assertCompanyOwner(req, res, companyId)) return;

    const { userId, designation = "", department = "", status = "Active", joinedAt } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const targetUser = await User.findById(userId).select("name email role");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (String(userId) === String(companyId)) {
      return res.status(400).json({ message: "A company cannot add itself as an employee." });
    }

    // A user can belong to multiple companies — check only for THIS company
    const existing = await CompanyMember.findOne({ company: companyId, user: userId });
    if (existing) {
      // If they exist but are Inactive, reactivate instead of erroring
      if (existing.status === "Inactive") {
        existing.status = "Active";
        if (designation) existing.designation = designation;
        if (department) existing.department = department;
        if (joinedAt) existing.joinedAt = new Date(joinedAt);
        await existing.save();
        // A fresh .lean() re-fetch, not existing.populate(...) — see the
        // .lean() comment on getEmployees above for why: populating a
        // live (non-lean) document has the same discriminator-field-
        // stripping problem a non-lean query does.
        const populated = await CompanyMember.findById(existing._id)
          .populate({ path: "user", select: "name email headline profilePic companyLogo bio role" })
          .lean();
        return res.status(200).json({
          message: "Employee reactivated successfully.",
          employee: populated,
        });
      }
      return res.status(409).json({
        message: "This user is already an active member of the company.",
        member: existing,
      });
    }

    const member = await CompanyMember.create({
      company: companyId,
      user: userId,
      designation,
      department,
      status,
      joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
    });

    const populated = await CompanyMember.findById(member._id)
      .populate({ path: "user", select: "name email headline profilePic companyLogo bio role" })
      .lean();

    res.status(201).json({ message: "Employee added successfully.", employee: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This user is already a member of the company." });
    }
    console.error("addEmployee error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── PUT /api/companies/:companyId/employees/:memberId ────────────────────────
const updateEmployee = async (req, res) => {
  try {
    const { companyId, memberId } = req.params;

    if (!isValidObjectId(companyId) || !isValidObjectId(memberId)) {
      return res.status(400).json({ message: "Invalid ID." });
    }

    if (!assertCompanyOwner(req, res, companyId)) return;

    const { designation, department, status, joinedAt } = req.body;

    const member = await CompanyMember.findOne({ _id: memberId, company: companyId });
    if (!member) {
      return res.status(404).json({ message: "Employee not found." });
    }

    if (designation !== undefined) member.designation = designation;
    if (department !== undefined) member.department = department;
    if (status !== undefined) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'Active' or 'Inactive'." });
      }
      member.status = status;
    }
    if (joinedAt !== undefined) member.joinedAt = new Date(joinedAt);

    await member.save();

    const populated = await CompanyMember.findById(member._id)
      .populate({ path: "user", select: "name email headline profilePic companyLogo bio role" })
      .lean();

    res.json({ message: "Employee updated successfully.", employee: populated });
  } catch (error) {
    console.error("updateEmployee error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── DELETE /api/companies/:companyId/employees/:memberId ─────────────────────
// Sets status to Inactive (soft delete). Company owner OR the employee
// themselves can remove the membership.
const removeEmployee = async (req, res) => {
  try {
    const { companyId, memberId } = req.params;

    if (!isValidObjectId(companyId) || !isValidObjectId(memberId)) {
      return res.status(400).json({ message: "Invalid ID." });
    }

    const member = await CompanyMember.findOne({ _id: memberId, company: companyId });
    if (!member) {
      return res.status(404).json({ message: "Employee not found." });
    }

    // Allow: company owner, superadmin, or the employee themselves
    const isSuperAdmin = req.user.role === "superadmin";
    const isOwner = String(req.user._id) === String(companyId);
    const isSelf = String(req.user._id) === String(member.user);

    if (!isSuperAdmin && !isOwner && !isSelf) {
      return res.status(403).json({ message: "Access denied." });
    }

    member.status = "Inactive";
    await member.save();

    res.json({ message: "Employee deactivated successfully." });
  } catch (error) {
    console.error("removeEmployee error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── GET /api/companies/:companyId/employees/search-users ────────────────────
const searchUsersToAdd = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    if (!assertCompanyOwner(req, res, companyId)) return;

    const { q = "" } = req.query;
    if (q.length < 2) {
      return res.json({ users: [] });
    }

    const existingMembers = await CompanyMember.find({
      company: companyId,
      status: "Active",
    }).select("user");
    const existingUserIds = existingMembers.map((m) => m.user);

    const users = await User.find({
      _id: { $nin: [companyId, ...existingUserIds] },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
      isActive: true,
    })
      .select("name email role headline profilePic")
      .limit(10)
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("searchUsersToAdd error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── GET /api/jobseeker/company-memberships ───────────────────────────────────
// Returns the LOGGED-IN user's own memberships across ALL companies.
// A single user can belong to multiple companies simultaneously.
const getMyMemberships = async (req, res) => {
  try {
    const memberships = await CompanyMember.find({ user: req.user.id })
      .populate({
        path: "company",
        select: "name companyLogo industryType address description",
      })
      .sort({ status: 1, joinedAt: -1 }) // Active first, then most recent
      .lean();

    res.json({ memberships });
  } catch (error) {
    console.error("getMyMemberships error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── GET /api/companies/:companyId/my-membership ─────────────────────────────
// Returns the logged-in user's membership record for a specific company,
// if any. Used by the company page to show "You work here" badge.
const getMyMembershipAtCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!isValidObjectId(companyId)) {
      return res.status(400).json({ message: "Invalid company ID." });
    }

    const membership = await CompanyMember.findOne({
      company: companyId,
      user: req.user.id,
    });

    res.json({ membership: membership || null });
  } catch (error) {
    console.error("getMyMembershipAtCompany error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// ─── GET /api/users/:userId/companies ────────────────────────────────────────
// Returns all companies a specific user belongs to — public endpoint
// used by community profile pages to show LinkedIn-style "Works at" section.
const getUserCompanies = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const memberships = await CompanyMember.find({
      user: userId,
      status: "Active",
    })
      .populate({
        path: "company",
        select: "name companyLogo industryType address",
      })
      .sort({ joinedAt: -1 })
      .lean();

    res.json({ memberships });
  } catch (error) {
    console.error("getUserCompanies error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getEmployees,
  getEmployeeCount,
  getEmployee,
  addEmployee,
  updateEmployee,
  removeEmployee,
  searchUsersToAdd,
  getMyMemberships,
  getMyMembershipAtCompany,
  getUserCompanies,
};