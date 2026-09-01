const AiUsageLog = require("../models/AiUsageLog");
const jwt = require("jsonwebtoken");

function getOptionalUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    return decoded.id || null;
  } catch {
    return null;
  }
}

exports.logResumeBuild = async (req, res) => {
  try {
    const { templateId, templateName, action } = req.body || {};

    await AiUsageLog.create({
      feature: "resume_builder",
      action: action === "created" ? "created" : "downloaded",
      templateId: templateId || "unknown",
      templateName: templateName || undefined,
      user: getOptionalUserId(req),
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Failed to log resume build:", error.message);
    return res.status(200).json({ success: false });
  }
};

exports.getAiUsageStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalResumeBuilds, buildsLast30Days, byTemplateAgg, dailyTrendAgg, recentBuilds] =
      await Promise.all([
        AiUsageLog.countDocuments({ feature: "resume_builder" }),
        AiUsageLog.countDocuments({ feature: "resume_builder", createdAt: { $gte: thirtyDaysAgo } }),
        AiUsageLog.aggregate([
          { $match: { feature: "resume_builder" } },
          { $group: { _id: "$templateId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AiUsageLog.aggregate([
          { $match: { feature: "resume_builder", createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        AiUsageLog.find({ feature: "resume_builder" })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("templateId templateName action createdAt user")
          .lean(),
      ]);

    return res.status(200).json({
      totalResumeBuilds,
      buildsLast30Days,
      byTemplate: byTemplateAgg.map((t) => ({ templateId: t._id || "unknown", count: t.count })),
      dailyTrend: dailyTrendAgg.map((d) => ({ date: d._id, count: d.count })),
      recentBuilds,
    });
  } catch (error) {
    console.error("Failed to fetch AI usage stats:", error.message);
    return res.status(500).json({ message: "Failed to load AI usage stats" });
  }
};