const Report = require("../models/Report");
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Job = require("../models/Job");
const Blog = require("../models/Blog");
const { recordAdminAudit } = require("../utils/auditLogger");
const sendNotification = require("../utils/sendNotifications");

// Submit a new report (any authenticated user)
exports.createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: "targetType, targetId, and reason are required." });
    }

    if (!["user", "job", "post", "comment", "blog"].includes(targetType)) {
      return res.status(400).json({ message: "Invalid targetType." });
    }

    // Determine reportedUser from target
    let reportedUser = null;
    if (targetType === "user") {
      reportedUser = targetId;
    } else if (targetType === "post") {
      const post = await Post.findById(targetId).select("author");
      if (post) reportedUser = post.author;
    } else if (targetType === "comment") {
      const comment = await Comment.findById(targetId).select("author");
      if (comment) reportedUser = comment.author;
    } else if (targetType === "job") {
      const job = await Job.findById(targetId).select("employer");
      if (job) reportedUser = job.employer;
    } else if (targetType === "blog") {
      const blog = await Blog.findById(targetId).select("author");
      if (blog) reportedUser = blog.author;
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reportedUser,
      reason: reason.trim(),
      description: (description || "").trim(),
      status: "pending",
    });

    res.status(201).json({ message: "Report submitted successfully.", report });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: "Failed to submit report." });
  }
};

// Get all reports (Admin / Super Admin)
exports.getAllReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { targetType, status, search } = req.query;

    const query = {};
    if (targetType && targetType !== "all") {
      query.targetType = targetType;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate("reporter", "name email role")
        .populate("reportedUser", "name email role")
        .populate("resolvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Report.countDocuments(query),
    ]);

    // Attach brief target previews
    const enhanced = await Promise.all(
      reports.map(async (r) => {
        let targetPreview = null;
        try {
          if (r.targetType === "post") {
            const p = await Post.findById(r.targetId).select("content media").lean();
            if (p) targetPreview = { title: p.content?.slice(0, 100), media: p.media?.[0]?.url };
          } else if (r.targetType === "comment") {
            const c = await Comment.findById(r.targetId).select("content").lean();
            if (c) targetPreview = { title: c.content?.slice(0, 100) };
          } else if (r.targetType === "job") {
            const j = await Job.findById(r.targetId).select("title companyOverride location").lean();
            if (j) targetPreview = { title: j.title, subtitle: j.companyOverride?.name || j.location };
          } else if (r.targetType === "blog") {
            const b = await Blog.findById(r.targetId).select("title featuredImage").lean();
            if (b) targetPreview = { title: b.title, media: b.featuredImage };
          } else if (r.targetType === "user") {
            const u = await User.findById(r.targetId).select("name email role").lean();
            if (u) targetPreview = { title: u.name, subtitle: `${u.role} · ${u.email}` };
          }
        } catch {
          // target may be deleted
        }
        return { ...r, targetPreview };
      })
    );

    res.json({ reports: enhanced, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Failed to load reports." });
  }
};

// Get report summary statistics (Admin / Super Admin)
exports.getReportStats = async (req, res) => {
  try {
    const [total, pending, resolved, dismissed, byTypeAgg] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "dismissed" }),
      Report.aggregate([
        { $group: { _id: "$targetType", count: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } } } },
      ]),
    ]);

    const byType = {
      user: { total: 0, pending: 0 },
      job: { total: 0, pending: 0 },
      post: { total: 0, pending: 0 },
      comment: { total: 0, pending: 0 },
      blog: { total: 0, pending: 0 },
    };

    byTypeAgg.forEach((item) => {
      if (byType[item._id]) {
        byType[item._id] = { total: item.count, pending: item.pending };
      }
    });

    res.json({ total, pending, resolved, dismissed, byType });
  } catch (error) {
    console.error("Error fetching report stats:", error);
    res.status(500).json({ message: "Failed to load report stats." });
  }
};

// Resolve or take action on a report (Admin / Super Admin)
exports.resolveReportAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, status = "resolved", adminNotes } = req.body;

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found." });

    report.status = status;
    report.adminNotes = adminNotes || report.adminNotes;
    report.adminAction = action || "none";
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();

    // Execute target consequence if applicable
    if (action === "removed_content") {
      if (report.targetType === "post") {
        await Post.findByIdAndUpdate(report.targetId, {
          isDeleted: true,
          "moderation.status": "removed",
          "moderation.reason": adminNotes || report.reason,
        });
      } else if (report.targetType === "comment") {
        await Comment.findByIdAndUpdate(report.targetId, { isDeleted: true });
      } else if (report.targetType === "job") {
        await Job.findByIdAndUpdate(report.targetId, {
          status: "Rejected",
          rejectionReason: adminNotes || report.reason,
        });
      } else if (report.targetType === "blog") {
        await Blog.findByIdAndUpdate(report.targetId, { isPublished: false });
      }
    } else if (action === "suspended_user" && report.reportedUser) {
      await User.findByIdAndUpdate(report.reportedUser, {
        isActive: false,
        deactivatedAt: new Date(),
      });
    }

    await report.save();

    // Log to Audit trail
    await recordAdminAudit({
      user: req.user,
      action: `Super Admin moderated Report #${report._id} (action: ${action || status})`,
      contentType: "Report",
      contentId: report._id,
      details: {
        targetType: report.targetType,
        targetId: report.targetId,
        action,
        status,
        adminNotes,
      },
    });

    // Notify reporter if appropriate
    if (report.reporter) {
      sendNotification({
        recipient: report.reporter,
        type: "system_announcement",
        message: `Your report regarding a ${report.targetType} has been reviewed and marked as ${status}.`,
        link: "/user/dashboard",
      });
    }

    res.json({ message: "Report action applied successfully.", report });
  } catch (error) {
    console.error("Error moderating report:", error);
    res.status(500).json({ message: "Failed to apply report action." });
  }
};
